// from : https://github.com/expo/expo/tree/master/packages/expo-sqlite/src
import { 
    // WebSQLiteCallback,
    // ResultSet,
    // PouchDBRow,
    WebSQLRows,
    WebSQLDatabase,
    WebSQLTransaction,
    WebSQLResultSet,
    ResultSetValue,
    SQLError,
    TxCallback,
    TxSuccessCallback,
    TxErrorCallback,
    ResultSetRow
} from './WebSQLite.types';

import {
    InfoObject,
    PouchDBMinimalDoc,
    PouchDBDoc,
    DocCount,
    PouchDBRow,
    AllDocsRow,
    AllDocsResponse,
    AllFullDocsRow,
    AllFullDocsResponse,
    DocSyncState,
    DocSyncAction,
    DocSyncTransaction,
    TxSyncActionSuccess,
    // PouchDBDoc,
    CouchFullDocsRow,
    CouchAllFullDocsResponse,
    PouchDocMap,
    AllDocsOptions,
    HTTPClient
 } from './PouchDB.types';

type AllDocRowsTuple = [AllDocsRow[], AllDocsRow[]];



// interface DocSyncStateCheck {
//     guard: (rDoc: AllDocsRow, lDocs: AllDocsRow[]) =>  Boolean;
//     action: (rDoc: AllDocsRow, lDocs: AllDocsRow[]) => DocSyncAction;
// }

export class OuchDB {
    db: WebSQLDatabase;
    dbName: string;
    httpClient: HTTPClient;

    takeSyncActions = {
        'delete': (tx, act: DocSyncAction) => this.deleteSyncAction(tx, act),
        'add': (tx, act: DocSyncAction) => this.addSyncAction(tx, act),
        'update': (tx, act: DocSyncAction) => this.updateSyncAction(tx, act),
    };


    testDocType = {
        isArray: (doc) => toString.call(doc) === '[object Array]',
        isObject: (doc) => toString.call(doc) === '[object Object]',
        hasID: (doc) => '_id' in doc,
        hasRev: (doc) => '_rev' in doc,
    }

    docPutErrors = [
        {
            test: doc => !this.testDocType.isObject(doc),
            error: {
                status: 400,
                name: 'bad_request',
                message: 'Document must be a JSON object',
                error: true
            }
        },{            
            test: doc => !this.testDocType.hasID(doc),
            error: {
                status: 412,
                name: 'missing_id',
                message: '_id is required for puts',
                error: true
            }
        },{            
            test: doc => true,
            error: undefined
        }
    ]

    constructor(db: WebSQLDatabase, httpClient: HTTPClient) {
        this.db = db;
        this.dbName = db['_db']['_db']['filename'];
        this.httpClient = httpClient;
        // this.initDBtable()
    }

    // resolves execution context from db
    getTx = async(): Promise<WebSQLTransaction> => 
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
    mapDocRows = (res: WebSQLResultSet): PouchDBRow[] => 
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
    getTables = (): Promise<ResultSetValue[]> => new Promise((resolve, reject)=> 
        this.db.readTransaction(tx =>
            tx.executeSql(
                'SELECT tbl_name from sqlite_master WHERE type = "table"',
                [],
                (tx, res) => resolve([tx, res]),
                (tx, err) => reject([tx, err])
            )
        )
    ).then((txCb: TxSuccessCallback) => {
        const [_, res] = txCb;
        const tables: ResultSetValue[] = res.rows._array.map(y => y['tbl_name']);
        // const tables: string[] = res['rows']['_array'].map(y => y['tbl_name']);
        return Promise.resolve(tables);
    })

    // drops table from db with given table name
    drobTable = (tx: WebSQLTransaction, tableName: string) => new Promise((resolve, reject) =>
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

    updateSyncAction = (tx: WebSQLTransaction, action: DocSyncAction): Promise<TxSyncActionSuccess> => 
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

    addSyncAction = (tx: WebSQLTransaction, action: DocSyncAction): Promise<TxSyncActionSuccess> => 
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

    deleteSyncAction = (tx: WebSQLTransaction, action: DocSyncAction): Promise<TxSyncActionSuccess> => 
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

    getAllRemoteDocs = ():Promise<CouchAllFullDocsResponse> => // need to change the endpoint
        this.httpClient.get(`http://127.0.0.1:3000/_all_docs?include_docs=true`)

    convertDoc2Map = (acc: PouchDocMap, row: CouchFullDocsRow): PouchDocMap => {
        acc[row.id] = row.doc;
        return acc;
    }
        // ({...acc, ...{ [row.id]: row.doc }});

    enrichDocSyncAction = (action: DocSyncAction, docsMap: PouchDocMap) =>
        (action.state !== 'delete') 
            ? { ...action, ...{ doc: docsMap[action.id] }}
            : action;

    // SOQ/18004296/how-to-bulk-fetch-by-ids-in-couchdb-without-creating-a-view
    getRemoteDocs4SyncActions = (actions: DocSyncAction[]): Promise<DocSyncAction[]> =>
        this.getAllRemoteDocs()
        .then((res: CouchAllFullDocsResponse) => {
            const docsMap: PouchDocMap = res.rows
                .filter(row => row.id !== '_design/access')
                .reduce(this.convertDoc2Map, {} as PouchDocMap);

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

    syncAction2DB = (tx: WebSQLTransaction, actions: DocSyncAction[]): Promise<TxSyncActionSuccess>[] => 
        actions.map(action => this.takeSyncActions[action.state](tx, action));

    syncAllActions2DB = (actions: DocSyncAction[]): Promise<TxSyncActionSuccess[]> => 
        this.getTx()
        .then((tx: WebSQLTransaction) => 
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
        .then((dumpRows: PouchDBDoc[]) => this.insertDumpRows(dumpRows))
    }
    // checks if dump string contains dump or just a url to dump file...
    getDumpRows = (dump : string): Promise<PouchDBDoc[]> => {
        const dumps = dump.split('\n');
        return (dumps.length === 3)
            ? Promise.resolve(JSON.parse(dumps[1])['docs'])
            : this.httpClient.get(dump).then(res => this.getDumpRows(res));
    }

    insertDumpRows = (rows: PouchDBDoc[]): Promise<TxSyncActionSuccess[]> =>
        this.getTx().then(tx => {
            const addActions = rows.map<DocSyncAction>(doc => (
                // map doc to DocySyncAction
                { state: 'add', id: doc._id, doc: doc } 
            ))
            .map(row => this.addSyncAction(tx, row));
            return Promise.all(addActions);
        })


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

    getDocCount = (): Promise<number> => 
        new Promise((resolve, reject) => 
            this.db.readTransaction(tx =>
                tx.executeSql(
                    'SELECT COUNT(*) as "docCount" FROM "by-sequence"',
                    [],
                    (_, res) => resolve(res.rows._array[0]['docCount'] as number),
                    (_, err) => reject(err)
                )
            )
        );

    getDoc = (id: string): Promise<PouchDBRow> => 
        new Promise((resolve, reject) => 
            this.db.readTransaction(tx =>
                tx.executeSql(
                    `SELECT * FROM "by-sequence" WHERE doc_id="${id}"`,
                    [],
                    (_, res) => resolve(res.rows._array[0]),
                    (_, err) => reject(err)
                )
            )
        );

    getAllDocs = (): Promise<WebSQLRows> => 
        new Promise((resolve, reject) => 
            this.db.readTransaction(tx =>
                tx.executeSql(
                    `SELECT * FROM "by-sequence"`,
                    [],
                    (_, res) => resolve(res.rows),
                    (_, err) => reject(err)
                )
            )
        );

    getAllDocsWithStartId = (idStart: string): Promise<WebSQLRows> => 
        new Promise((resolve, reject) => 
            this.db.readTransaction(tx =>
                tx.executeSql(
                    `SELECT * FROM "by-sequence" WHERE id LIKE "${idStart}%"`,
                    [],
                    (_, res) => resolve(res.rows._array),
                    (_, err) => reject(err)
                )
            )
        );

    putDoc = (id: string): Promise<PouchDBRow> => 
        new Promise((resolve, reject) => 
            this.db.readTransaction(tx =>
                tx.executeSql(
                    `SELECT * FROM "by-sequence" WHERE doc_id="${id}"`,
                    [],
                    (_, res) => resolve(res.rows._array[0]),
                    (_, err) => reject(err)
                )
            )
        );

    getRev = (id: string): Promise<string> => 
        new Promise((resolve, reject) => 
            this.db.readTransaction(tx =>
                tx.executeSql(
                    `SELECT rev FROM "by-sequence" WHERE doc_id="${id}"`,
                    [],
                    (_, res) => resolve(res.rows._array[0]['rev'] as string),
                    (_, err) => reject(err)
                )
            )
        );

    checkDocId = (id: string): Promise<WebSQLTransaction> => 
        new Promise((resolve, reject) => 
            this.db.transaction(tx =>
                tx.executeSql(
                    `SELECT id FROM "by-sequence" WHERE doc_id="${id}"`,
                    [],
                    (_, res) => reject(`Doc with id: ${id} already in db!`),
                    (tx, err) => resolve(tx)
                )
            )
        );

    info(): Promise<InfoObject> {
        return this.getDocCount()
        .then(docCount => ({
                doc_count: docCount,
                update_seq: docCount,
                websql_encoding: 'UTF-8',
                db_name: this.db['_db']['_db']['filename'],
                auto_compaction: false,
                adapter: 'websql'
            })
        );
    }

    get(id: string): Promise<PouchDBDoc> {
        return this.getDoc(id)
        .then((row: PouchDBRow) => {
            const json = JSON.parse(row.json);
            return Promise.resolve({ 
                ...json,
                ...{
                     _id: row.doc_id, 
                     _rev: row.rev 
                    } 
            });
        })
        .catch(err => Promise.reject({
            status: 404,
            name: 'not_found',
            message: 'missing',
            error: true,
            reason: 'missing',
            docId: id
        }))
        // PouchError { TODO: need an OuchError
        //     status: 404,
        //     name: 'not_found',
        //     message: 'missing',
        //     error: true,
        //     reason: 'missing',
        //     docId: 'splinter'
        //   }
      
    }

    map2AllDoc = (row: PouchDBRow) => ({
        id: row.doc_id as string,
        key: row.doc_id as string,
        value: { rev:  row.rev as string }
    });

    map2AllFullDoc = (row: PouchDBRow) => ({
        id: row.doc_id as string,
        key: row.doc_id as string,
        value: { rev:  row.rev as string },
        doc: { ...JSON.parse(row.json), ...{ _id: row.doc_id, _rev: row.rev }}
    });

    allDocs(option: AllDocsOptions): Promise<AllDocsResponse|AllFullDocsRow> {
        return new Promise((resolve, reject) => 
            this.getAllDocs()
            .then(rows => {
                if(!option){
                    const idNRevs = {
                        total_rows: rows.length,
                        offset: 0,
                        rows: rows._array.map<AllDocsRow>(this.map2AllDoc)
                    };
                    resolve(idNRevs);
                } else {
                    const idNRevs = {
                        total_rows: rows.length,
                        offset: 0,
                        rows: rows._array.map<AllFullDocsRow>(this.map2AllFullDoc)
                    };
                    resolve(idNRevs);
                }
        })
        )
    };

    put(doc: PouchDBMinimalDoc | PouchDBDoc): Promise<any> {
        let typeCheck = this.docPutErrors.find(i => i.test(doc))
        if(!!typeCheck.error) {
            return Promise.reject(typeCheck.error);
        } else if ('_rev' in doc) {
            return this.getRev(doc._id)
            .then(rev => {
                return rev === doc._rev
                    ?  Promise.resolve({
                        ok: true,
                        id: doc._id,
                        rev: (this.getRevInt(rev) + 1).toString() + rev.slice(1)  
                    })
                    : Promise.reject();
            })
            .catch(_ => Promise.reject({
                status: 409,
                name: 'conflict',
                message: 'Document update conflict',
                error: true,
                id: doc._id,
                docId: doc._id
            }))
        } else {
            return this.checkDocId(doc._id)
                .then(tx => {
                    const addAction: DocSyncAction = {
                        state: 'add',
                        id: doc._id,
                        doc: { 
                            ...doc, 
                            ...{ _rev: '1-XXXXX' } // generate some rev here!
                            }
                    }
                    return this.addSyncAction(tx, addAction);
                } 
                )
                .catch(() => Promise.reject({
                    status: 409,
                    name: 'conflict',
                    message: 'Document update conflict',
                    error: true,
                    id: doc._id,
                    docId: doc._id
                })
            )

        }

    }
        // .then((row: PouchDBRow) => {
        //     const json = JSON.parse(row.json);
        //     return Promise.resolve({ 
        //         ...json,
        //         ...{
        //              _id: row.doc_id, 
        //              _rev: row.rev 
        //             } 
        //     });
        // })   
        
        // PouchError {
        //     status: 400,
        //     name: 'bad_request',
        //     message: 'Document must be a JSON object',
        //     error: true
        //   }

        // PouchError {
        //     status: 412,
        //     name: 'missing_id',
        //     message: '_id is required for puts',
        //     error: true
        //   }

        // PouchError { // no provided _rev???
        //     status: 404,
        //     name: 'not_found',
        //     message: 'missing',
        //     error: true,
        //     reason: 'missing',
        //     docId: 'splinter'
        //   }

        // PouchError { // 1st put: _rev provided but no doc present
                // & 2nd put: no _rev provided
                // & 2nd put wrong _rev provided
        //     status: 409,
        //     name: 'conflict',
        //     message: 'Document update conflict',
        //     error: true,
        //     id: 'splinter',
        //     docId: 'splinter'
        //   }

        // {  // 1st no _rev provided
        //     ok: true,
        //     id: 'splinter',
        //     rev: '1-a24f0fc8ad85f4de56ddbe793d0a7057' 
        // }

    
};