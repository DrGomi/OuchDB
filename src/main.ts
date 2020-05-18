// from : https://github.com/expo/expo/tree/master/packages/expo-sqlite/src
import { 
    Query,
    Window,
    Database,
    SQLiteCallback,
    // ResultSet,
    // PouchDBRow,
    SQLTransaction,
    SQLResultSet,
    SQLError,
    TxCallback,
    TxSuccessCallback,
    TxErrorCallback
} from './SQLite.types';

import { 
    PouchDBRow,
    AllDocsRow,
    AllDocsResponse,
    AllFullDocsRow,
    AllFullDocsResponse,
    DocSyncState,
    DocSyncAction,
    DocSyncTransaction,
    TxSyncActionSuccess,
    TurtleDoc,
    TurtleFullDocsRow,
    TurtleAllFullDocsResponse,
    TurtleDocMap,
    HTTPClient
 } from './PouchDB.types';

type AllDocRowsTuple = [AllDocsRow[], AllDocsRow[]];



// interface DocSyncStateCheck {
//     guard: (rDoc: AllDocsRow, lDocs: AllDocsRow[]) =>  Boolean;
//     action: (rDoc: AllDocsRow, lDocs: AllDocsRow[]) => DocSyncAction;
// }

export class OuchDB {
    db: Database;
    httpClient: HTTPClient;

    takeSyncActions = {
        'delete': (tx, act: DocSyncAction) => this.deleteSyncAction(tx, act),
        'add': (tx, act: DocSyncAction) => this.addSyncAction(tx, act),
        'update': (tx, act: DocSyncAction) => this.updateSyncAction(tx, act),
    };

    constructor(db: Database, httpClient: HTTPClient) {
        this.db = db;
        this.httpClient = httpClient;
        // this.initDBtable()
    }

    // resolves execution context from db
    getTx = async(): Promise<SQLTransaction> => 
        new Promise((resolve, reject) => 
            this.db.transaction(
                (tx) => resolve(tx),
                (err) => reject(err),
            )
        );

    // resolves execution context & resultset with all rows from given table
    getAllRows = (): Promise<TxSuccessCallback> => 
        new Promise((resolve, reject) =>   
            this.db.transaction(tx => 
                tx.executeSql(
                    `SELECT * FROM "by-sequence"`, 
                    [], 
                    (tx, res) => resolve([tx, res]),
                    (tx, err) => reject([tx, err])
                )
            )
        );

    // extracts rows from resultset
    mapDocRows = (res: SQLResultSet): PouchDBRow[] => 
        Object.keys(res.rows).map(_ => res.rows[_])[0];

    // transforms pouchdb revision string into integer
    getRevInt =(inRev: string): number => 
        parseInt(inRev.split('-')[0]);

    // compares 2 docs by doc_id & revision value
    compareLocalDocs = (left: PouchDBRow, right: PouchDBRow) =>
        left.doc_id !== right.doc_id 
            ? true 
            // : left == right ||
            : this.getRevInt(left.rev) > this.getRevInt(right.rev);

    compareSyncDocs = (left: AllDocsRow, right: AllDocsRow) =>
        left.id !== right.id 
            ? true 
            : this.getRevInt(left.value.rev) > this.getRevInt(right.value.rev);
    
    check4SameID = (docs: PouchDBRow[], checkDoc: PouchDBRow): boolean => 
                    !!(docs.find(doc => doc.doc_id === checkDoc.doc_id));

    // returns unique rows with the highest revision id
    filterOldLocalRevs = (origSeq: PouchDBRow[]): PouchDBRow[] => 
        origSeq.reduce<PouchDBRow[]>(
            (acc, iter) => {
                // try to filter out docs (with same id & lower revision) ...
                const filterRows = acc.filter(x => this.compareLocalDocs(x, iter));
                // ...check if doc with same id is still present in filtered rows...
                return this.check4SameID(filterRows, iter) 
                    ? filterRows                    // this doc's rev id higher 
                    : [...filterRows, ...[iter]];   // OR: add the iter doc to list
            },[]);

    // deletes provided pouchdb doc from "by-sequence" table 
    deleteRev = (tx, doc: PouchDBRow): Promise<void> => new Promise((resolve, reject) => 
        tx.executeSql(
            `DELETE FROM "by-sequence" WHERE
             doc_id = "${doc.doc_id}"
             AND rev = "${doc.rev}"`,
            [],
            () => resolve(),
            (err) => reject(err)
        )
    );
  
    // resolves when all docs not present in filterSeq are deleted from table
    killOldRevs = (origSeq: PouchDBRow[], filterSeq: PouchDBRow[]): Promise<any> => 
        this.getTx().then(tx => 
            Promise.all(
                origSeq // only delete docs exclusive to origSeq
                .filter(x => !filterSeq.includes(x))
                .map(x => this.deleteRev(tx, x))
            )
        );

    // retrieves all docs & deletes old versions of docs from table
    pruneOldLocalRevs = () => 
        this.getAllRows()
        .then(txNrs => {
            const [_, res] = txNrs;
            const origSeq: PouchDBRow[] = this.mapDocRows(res);
            const filterSeq: PouchDBRow[] = this.filterOldLocalRevs(origSeq);
            return this.killOldRevs(origSeq, filterSeq);
        })

    // resolves all table names from db as Array<string> 
    getTables = (): Promise<string[]> => new Promise((resolve, reject)=> 
        this.db.transaction(tx =>
            tx.executeSql(
                'SELECT tbl_name from sqlite_master WHERE type = "table"',
                [],
                (tx, res) => resolve([tx, res]),
                (tx, err) => reject([tx, err])
            )
        )
    ).then((txCb: TxSuccessCallback) => {
        const [_, res] = txCb;
        const tables: string[] = res['rows']['_array'].map(y => y['tbl_name']);
        return Promise.resolve(tables);
    })

    // drops table from db with given table name
    drobTable = (tx: SQLTransaction, tableName: string) => new Promise((resolve, reject) =>
        tx.executeSql(
            `DROP TABLE "${tableName}"`,
            [],
            (tx, res) => resolve([tx, res]),
            (tx, err) => reject([tx, err]))
        );

    // resolves when all unneccessary pouchdb tables are dropped 
    dropFunnyTables = () =>
        this.getTx().then(tx => 
            Promise.all(
                [
                    'attach-store',
                    'local-store',
                    'attach-seq-store',
                    'document-store',
                    'metadata-store'
                ].map(x => this.drobTable(tx, x))
            )
        );

    // resolves all local rows transformed into couchdb _all_docs response 
    getLocalAllDocs = (): Promise<AllDocsResponse> => 
        this.getAllRows()
        .then(txNrs => {
            const [_, res] = txNrs;
            const rows: PouchDBRow[] = this.mapDocRows(res)
            const allDocs: AllDocsResponse =  {
                total_rows: rows.length,
                offset: 0,
                rows: rows.map(doc => ({
                    id: doc.doc_id,
                    key: doc.doc_id,
                    value: { rev: doc.rev }
                })) as AllDocsRow[]
            };
            return Promise.resolve(allDocs);
        });

    getCleanAllDocRows = (rawResponse: AllDocsResponse): AllDocsRow[] => 
        rawResponse.rows.filter(row => row.id !== "_design/access");
    
    sameIdNHigherRev = (localDoc: AllDocsRow) => (remoteDoc: AllDocsRow): Boolean =>
        localDoc.id === remoteDoc.id && 
        this.getRevInt(localDoc.value.rev) < this.getRevInt(remoteDoc.value.rev)

    map2SyncAction = (syncState: DocSyncState) =>  (doc: AllDocsRow): DocSyncAction => 
        ({ state: syncState, id: doc.id });

    getChangedDocs = (leftRows: AllDocsRow[], rightRows: AllDocsRow[]): DocSyncAction[] => 
        leftRows
        .filter(leftDoc => !!(rightRows.find(this.sameIdNHigherRev(leftDoc))) )
        .map(this.map2SyncAction('update'));
    
    getExclusiveDocs = (
                        leftRows: AllDocsRow[],
                        rightRows: AllDocsRow[],
                        syncState: DocSyncState
                        ): DocSyncAction[] =>
        leftRows
        .filter(lDoc => !(rightRows.find(rDoc => lDoc.id === rDoc.id)))
        .map(this.map2SyncAction(syncState));

    compareWithRemote = (localNremoteDocs: AllDocRowsTuple): DocSyncAction[] => {
        // destructure all_docs-rows tuple
        const [localDocs, remoteDocs] = localNremoteDocs;

        // changed docs need to be converted to 'update' actions
        const changedRows = this.getChangedDocs(localDocs, remoteDocs);

        // docs exclusive to remote response need to be added to db
        const onlyRemoteRows = this.getExclusiveDocs(remoteDocs, localDocs, 'add');

        // docs exclusive present in local db need to be deleted from db
        const onlyLocalRows = this.getExclusiveDocs(localDocs, remoteDocs, 'delete');

        return [...changedRows, ...onlyRemoteRows, ...onlyLocalRows];
    }

    updateSyncAction = (tx: SQLTransaction, action: DocSyncAction): Promise<TxSyncActionSuccess> => 
        new Promise((resolve, reject) => {
            const {_id, _rev, ...jsonValue} = action.doc;
            const {doc, ...response } = action;
            tx.executeSql(
                `UPDATE "by-sequence" SET json = ?, rev = ?  WHERE doc_id = ?`,
                [JSON.stringify(jsonValue), doc._rev, doc._id],
                (tx, res) => resolve([tx, {...response, ...{ done:'success'}}]),
                (tx, err) => reject([tx, err]),
            )
    });

    addSyncAction = (tx: SQLTransaction, action: DocSyncAction): Promise<TxSyncActionSuccess> => 
        new Promise((resolve, reject) => {
            const {_id, _rev, ...jsonValue} = action.doc;
            const {doc, ...response } = action;
            tx.executeSql(
                `INSERT INTO "by-sequence" (json, deleted, doc_id, rev)
                 VALUES (?, ?, ?, ?)`,
                [JSON.stringify(jsonValue), 0, doc._id, doc._rev],
                (tx, res) => resolve([tx, {...response, ...{ done:'success'}}]),
                (tx, err) => reject([tx, err]),
            )
    });

    deleteSyncAction = (tx: SQLTransaction, action: DocSyncAction): Promise<TxSyncActionSuccess> => 
        new Promise((resolve, reject) =>
            tx.executeSql(
                `DELETE FROM "by-sequence" WHERE doc_id = ?`,
                [action.id],
                (tx, res) => resolve([tx, {...action, ...{ done:'success'}}]),
                (tx, err) => reject([tx, err]),
            )
    );

    getRemoteDoc = (docID: string): any =>
            this.httpClient.get(`http://127.0.0.1:3000/${docID}`)

    getAllRemoteDocs = ():Promise<TurtleAllFullDocsResponse> => // need to change the endpoint
        this.httpClient.get(`http://127.0.0.1:3000/_all_docs?include_docs=true`)

    convertDoc2Map = (acc: TurtleDocMap, row: TurtleFullDocsRow): TurtleDocMap => {
        acc[row.id] = row.doc;
        return acc;
    }
        // ({...acc, ...{ [row.id]: row.doc }});

    enrichDocSyncAction = (action: DocSyncAction, docsMap: TurtleDocMap) =>
        (action.state !== 'delete') 
            ? { ...action, ...{ doc: docsMap[action.id] }}
            : action;

    // SOQ/18004296/how-to-bulk-fetch-by-ids-in-couchdb-without-creating-a-view
    getRemoteDocs4SyncActions = (actions: DocSyncAction[]): Promise<DocSyncAction[]> =>
        this.getAllRemoteDocs()
        .then((res: TurtleAllFullDocsResponse) => {
            const docsMap: TurtleDocMap = res.rows
                .filter(row => row.id !== '_design/access')
                .reduce(this.convertDoc2Map, {} as TurtleDocMap);

            const enrichedActions = actions.reduce((acc, action: DocSyncAction) =>
                ([...acc, ...[this.enrichDocSyncAction(action, docsMap)] ]), 
            [] as DocSyncAction[]);

            return Promise.resolve(enrichedActions);
        })

        // test: do actions require another get '_all_docs' request?
    enrichSyncActionsWithDocs = (actions: DocSyncAction[]): Promise<DocSyncAction[]> => (
        !!actions.find(act => (act.state === 'update' || act.state === 'add'))
            ? this.getRemoteDocs4SyncActions(actions)
            : Promise.resolve(actions)
        // below would also work since update/add actions are added before delete (see 'compareWithRemote()')
        // (actions[0].state === 'update' || actions[0].state === 'add') 
    );

    syncAction2DB = (tx: SQLTransaction, actions: DocSyncAction[]): Promise<TxSyncActionSuccess>[] => 
        actions.map(action => this.takeSyncActions[action.state](tx, action));

    syncAllActions2DB = (actions: DocSyncAction[]): Promise<TxSyncActionSuccess[]> => 
        this.getTx()
        .then((tx: SQLTransaction) => 
            Promise.all(this.syncAction2DB(tx, actions)) 
        )

    processSyncActions = (actions: DocSyncAction[]): Promise<TxSyncActionSuccess[]> =>
        actions.length == 0            
            ? Promise.resolve([] as TxSyncActionSuccess[])
            : this.enrichSyncActionsWithDocs(actions)
                .then(actions => this.syncAllActions2DB(actions));

    load(dump: string): Promise<TxSyncActionSuccess[]> {
        return this.initDBtable()
        .then(() => this.getDumpRows(dump))
        .then((dumpRows: TurtleDoc[]) => this.insertDumpRows(dumpRows))
    }
    // checks if dump string contains dump or just a url to dump file...
    getDumpRows = (dump : string): Promise<TurtleDoc[]> => {
        const dumps = dump.split('\n');
        return (dumps.length === 3)
            ? Promise.resolve(JSON.parse(dumps[1])['docs'])
            : this.httpClient.get(dump).then(res => this.getDumpRows(res));
    }

    insertDumpRows = (rows: TurtleDoc[]): Promise<TxSyncActionSuccess[]> =>
        this.getTx().then(tx => {
            const addActions = rows.map(this.convertDoc2Action)
                                .map(row => this.addSyncAction(tx, row));
            return Promise.all(addActions);
        })

    convertDoc2Action= (doc: TurtleDoc): DocSyncAction => 
        ({ 
            state: 'add',
            id: doc._id,
            doc: doc
        });


    initDBtable = (): Promise<void> =>
        new Promise((resolve, reject) => 
            this.db.transaction(tx =>  
                tx.executeSql(
                    `CREATE TABLE IF NOT EXISTS "by-sequence" (
                        seq INTEGER PRIMARY KEY,
                        json TEXT,
                        deleted INT,
                        doc_id TEXT unique,
                        rev TEXT
                    )`,
                    [],
                    (tx, res) => resolve(),
                    (tx, err) => reject(err)
                )
            )
        );
    
};