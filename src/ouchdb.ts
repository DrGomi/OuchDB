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
    TxSyncActionSuccess,
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
    AllIdnRevRow,
    AllDocsResponse,
    AllDocsIdnRevResponse,
    AllFullDocsRow,
    AllFullDocsResponse,
    DocSyncState,
    DocSyncAction,
    DocSyncTransaction,
    // PouchDBDoc,
    CouchFullDocsRow,
    CouchAllFullDocsResponse,
    PouchDocMap,
    AllDocsOptions,
    HTTPClient
 } from './PouchDB.types';

type AllDocRowsTuple = [AllIdnRevRow[], AllIdnRevRow[]];

type Rows2DocsMapper = (row: PouchDBRow) => AllDocsRow;

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
            test: () => true,
            error: undefined
        }
    ]

    putDocActions = [
        {
            test: doc => !!this.docPutErrors.find(i => i.test(doc)).error,
            action: doc => Promise.reject(this.docPutErrors.find(i => i.test(doc)).error)
        },{
            test: doc => ('_rev' in doc),
            action: doc => this.getRev(doc._id)
                .then(rev => this.checkDocRevWithDBRev(doc as PouchDBDoc, rev))
                .catch(() => Promise.reject(this.docUpdateConflictError(doc._id)))
        },{
            test: doc => !('_rev' in doc),
            action: doc => this.addDocIfIdIsNew(doc)
            .catch(() => Promise.reject(this.docUpdateConflictError(doc._id)))
        }
    ];

    allDocsActions = [
        {
            test: (option: AllDocsOptions) => !option,
            action: () => this.getAllDocs().then(res => 
                this.mapAllDocs2Response(this.map2AllDoc)(res)
            )
        },{   
            test: (option: AllDocsOptions) => (
                Object.keys(option).length == 1 && 
                JSON.stringify(option) == "{\"include_docs\":true}"   
            ),
            action: () => this.getAllDocs().then(res => 
                this.mapAllDocs2Response(this.map2AllFullDoc)(res)
            )
        },{
            test: (option: AllDocsOptions) => (
                // Object.keys(option).length == 1 && 
                "keys" in option &&
                option['keys'].length > 0   
            ),
            action: (option: AllDocsOptions) => 
                this.getMultiDocs(this.ids2QueryString(option.keys))
                .then(rows =>
                    Promise.resolve({
                        total_rows: rows.length,
                        offset: 0,
                        // rows: res
                        rows: option.keys.reduce((acc, key) => {
                            const foundRow = rows._array.find(row => row.doc_id === key);
                            const returnDoc = !!foundRow 
                                ? this.map2AllFullDoc(foundRow) 
                                : { key: key, error: 'not_found'};
                            acc.push(returnDoc);
                            return acc;
                        }, [])
                    })
                )
        },{   
            test: (option: AllDocsOptions) => (
                // Object.keys(option).length == 1 && 
                "keys" in option &&
                option['keys'].length == 0   
            ),
            action: () => this.getAllDocs().then(res =>
                Promise.resolve({ 
                    total_rows: res.length,
                    offset: undefined,
                    rows: [] 
                })
            )
        },{             
            test: (option: AllDocsOptions) => (
                "startkey" in option &&
                "endkey" in option &&
                (!("include_docs" in option) || option['include_docs'] !== true)
            ),
            action: (option: AllDocsOptions) => this.getAllDocsWithStartId(option.startkey)
                .then(res => this.mapAllDocs2Response(this.map2AllDoc)(res))
        },{            
            test: (option: AllDocsOptions) => (
                "startkey" in option &&
                "endkey" in option &&
                "include_docs" in option &&
                 option['include_docs'] == true
            ),
            action: (option: AllDocsOptions) => this.getAllDocsWithStartId(option.startkey)
                .then(res => this.mapAllDocs2Response(this.map2AllFullDoc)(res))
        },{            
            test: () => true,
            action: () => Promise.reject({

            })
        }       
    ]

    constructor(db: WebSQLDatabase, httpClient: HTTPClient) {
        this.db = db;
        // this.dbName = db['_db']['_db']['filename'];
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

    compareSyncDocs = (left: AllIdnRevRow, right: AllIdnRevRow) =>
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
    getLocalAllDocs = (): Promise<AllDocsIdnRevResponse> => 
        this.getAllRows()
        .then(txNrs => {
            const [_, res] = txNrs;
            const rows: PouchDBRow[] = this.mapDocRows(res)
            const allDocs: AllDocsIdnRevResponse =  {
                total_rows: rows.length,
                offset: 0,
                rows: rows.map(doc => ({
                    id: doc.doc_id,
                    key: doc.doc_id,
                    value: { rev: doc.rev }
                })) as AllIdnRevRow[]
            };
            return Promise.resolve(allDocs);
        });

    getCleanAllDocRows = (rawResponse: AllDocsIdnRevResponse): AllIdnRevRow[] => 
        rawResponse.rows.filter(row => row.id !== "_design/access");
    
    sameIdNHigherRev = (localDoc: AllIdnRevRow) => (remoteDoc: AllIdnRevRow): Boolean =>
        localDoc.id === remoteDoc.id && 
        this.getRevInt(localDoc.value.rev) < this.getRevInt(remoteDoc.value.rev)

    map2SyncAction = (syncState: DocSyncState) =>  (doc: AllIdnRevRow): DocSyncAction => 
        ({ state: syncState, id: doc.id });

    getChangedDocs = (leftRows: AllIdnRevRow[], rightRows: AllIdnRevRow[]): DocSyncAction[] => 
        leftRows
        .filter(leftDoc => !!(rightRows.find(this.sameIdNHigherRev(leftDoc))) )
        .map(this.map2SyncAction('update'));
    
    getExclusiveDocs = (
                        leftRows: AllIdnRevRow[],
                        rightRows: AllIdnRevRow[],
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
            // console.log(tx)
            // console.log(action)
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
        return new Promise((resolve, reject) => this.initDBtable()
        .then(() => this.getDumpRows(dump))
        .then((dumpRows: PouchDBDoc[]) => this.insertDumpRows(dumpRows))
        .then(() => resolve())
        .catch(err => {
            console.log(err);
            reject(err);
        })
        )
    }
    // checks if dump string contains dump or just a url to dump file...
    getDumpRows = (dump : string): Promise<PouchDBDoc[]> => {
        const dumps = dump.split('\n');
        console.log(dumps.length)
        return (dumps.length === 3)
        // ? Promise.resolve(JSON.parse(dumps[1])['docs'])
        ? new Promise((resolve, reject) => {
            try {
                    console.log(dumps[1])
                    const dumpDocs = JSON.parse(dumps[1])['docs'];
                    resolve(dumpDocs);
                } catch(err) {
                    console.log('ERROR ',err);
                    reject(err)
                }
            })
            : this.httpClient.get(dump).then(res => {
                console.log('GOT ',res);
                return this.getDumpRows(res)
            });
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
                    () => resolve(),
                    (_, err) => reject(err)
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

    getSingleDoc = (id: string): Promise<PouchDBRow> => 
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

    ids2QueryString = (ids: string[]): string => 
        ids.map(x => `"${x}"`).join(', ')

    getMultiDocs = (ids: string): Promise<WebSQLRows> =>
        new Promise((resolve, reject) => 
            this.db.readTransaction(tx =>
                tx.executeSql(
                    `SELECT * FROM "by-sequence" WHERE doc_id IN (${ids})`,
                    [],
                    (_, res) => resolve(res.rows),
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
                    `SELECT * FROM "by-sequence" WHERE doc_id LIKE "${idStart}%"`,
                    [],
                    (_, res) => resolve(res.rows),
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
                    (_, res) => (res.rows.length > 0 && 'rev' in res.rows._array[0])
                            ? resolve(res.rows._array[0]['rev'] as string)
                            : reject(),
                    (_, err) => reject(err)
                )
            )
        );

    checkDocId = (id: string): Promise<WebSQLTransaction> => 
        new Promise((resolve, reject) => 
            this.db.readTransaction(tx =>
                tx.executeSql(
                    `SELECT doc_id FROM "by-sequence" WHERE doc_id="${id}"`,
                    [],
                    (tx, res) => {
                        (res.rows.length === 0)
                            ? resolve(tx)
                            : reject(`Doc with id: ${id} already in db!`)
                    },
                    (tx, _) => resolve(tx)
                )
            )
        );

    insertDoc = (tx: WebSQLTransaction, doc: PouchDBMinimalDoc): Promise<WebSQLTransaction> => 
        new Promise((resolve, reject) => {
            const { id, rev, ...jsonValue } = doc;
            // console.log(tx)
            console.log(doc)
            tx.executeSql(
                `INSERT INTO "by-sequence" (json, deleted, doc_id, rev)
                 VALUES (?, ?, ?, ?)`,
                [JSON.stringify(jsonValue), 0, id, '1-YYY'],
                (tx, res) => {
                    console.log('SUCCESS')
                    console.log(res)
                    resolve(tx)
                },
                (tx, err) => {
                    console.log(err)
                    reject(err)
                },
            )
    });

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

    getDocResponse = (row: PouchDBRow): PouchDBDoc => {
        const newDoc = JSON.parse(row.json);
        newDoc['_id'] = row.doc_id;
        newDoc['_rev'] = row.rev;
        return newDoc;
    }


    getDocError = (id: string) => ({
        status: 404,
        name: 'not_found',
        message: 'missing',
        error: true,
        reason: 'missing',
        docId: id
    })

    get(id: string): Promise<PouchDBDoc> {
        return new Promise((resolve, reject) =>
            this.getSingleDoc(id)
            .then((row: PouchDBRow) => resolve(this.getDocResponse(row)))
            .catch(err => reject(this.getDocError(id)))
        )
    }

    map2AllDoc = (row: PouchDBRow): AllIdnRevRow => ({
        id: row.doc_id as string,
        key: row.doc_id as string,
        value: { rev:  row.rev as string }
    });

    map2AllFullDoc = (row: PouchDBRow): AllFullDocsRow => ({
        id: row.doc_id as string,
        key: row.doc_id as string,
        value: { rev:  row.rev as string },
        doc: { ...JSON.parse(row.json), ...{ _id: row.doc_id, _rev: row.rev }}
    });


    mapAllDocs2Response = (lambda: Rows2DocsMapper)  => 
        (rows: WebSQLRows): Promise<AllDocsResponse> =>
            Promise.resolve<AllDocsResponse>({
                    total_rows: rows.length,
                    offset: 0,
                    rows: rows._array.map<AllDocsRow>(lambda)
                })



    allDocs(option: AllDocsOptions): Promise<AllDocsResponse> {
        return this.allDocsActions
                .find(i => i.test(option)).action(option)
    };

    docUpdateConflictError = (id: string) => ({
        status: 409,
        name: 'conflict',
        message: 'Document update conflict',
        error: true,
        id: id,
        docId: id
    })


    fakeHash4oldRev = (rev: string): string => 
        (this.getRevInt(rev) + 1).toString() + rev.slice(1)

    checkDocRevWithDBRev = (doc: PouchDBDoc, dbRev: string) => 
        new Promise((resolve, reject) =>
            dbRev === doc._rev
                ?  resolve({
                    ok: true,
                    id: doc._id,
                    rev: this.fakeHash4oldRev(dbRev)  
                })
                : reject()
        )

    doc2SyncAction = (doc: PouchDBMinimalDoc): DocSyncAction => ({
            state: 'add',
            id: doc._id,
            doc: { ...doc, ...{ _rev: '1-XXX' } } // TODO generate new id
        })

    addDocIfIdIsNew = (doc: PouchDBMinimalDoc) => {
        return this.checkDocId(doc._id)
        .then(() => this.getTx())
        .then(tx => {
            console.log('trying to put '+doc._id)
            console.log('IS IT running? '+tx._running)
            const addAction: DocSyncAction = this.doc2SyncAction(doc);
            return this.addSyncAction(tx, addAction);
        })
    }
                

    put(doc: PouchDBMinimalDoc | PouchDBDoc): Promise<any> {
        return this.putDocActions.find(i => i.test(doc)).action(doc)
    }

        // {  // 1st no _rev provided
        //     ok: true,
        //     id: 'splinter',
        //     rev: '1-a24f0fc8ad85f4de56ddbe793d0a7057' 
        // }

    
};