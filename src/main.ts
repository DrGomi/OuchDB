// from : https://github.com/expo/expo/tree/master/packages/expo-sqlite/src
import { 
    Query,
    Window,
    Database,
    SQLiteCallback,
    // ResultSet,
    PouchDBRow,
    SQLTransaction,
    SQLResultSet,
    SQLError,
    TxCallback,
    TxSuccessCallback,
    TxErrorCallback
} from './SQLite.types';

import { AllDocsRow, AllDocsResponse } from './PouchDB.types';

type AllDocRowsTuple = [AllDocsRow[], AllDocsRow[]];

type DocSyncState = 'unchanged' | 'delete' | 'update' | 'add';

interface DocSyncAction {
    state: DocSyncState;
    id: string;
}

// interface DocSyncStateCheck {
//     guard: (rDoc: AllDocsRow, lDocs: AllDocsRow[]) =>  Boolean;
//     action: (rDoc: AllDocsRow, lDocs: AllDocsRow[]) => DocSyncAction;
// }

export class OuchDB {
    db: Database;
    httpFetch;
    constructor(db: Database) {
        this.db = db;
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
        this.getTx().then(tx => 
            new Promise((resolve, reject) =>   
                tx.executeSql(
                    // `SELECT * FROM "${table}"`, 
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
    deleteRev = (tx, doc: PouchDBRow): Promise<void> =>  new Promise((resolve, reject) => 
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
        this.getTx().then(tx =>
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

    compareWithRemote = (localNremoteDocs: AllDocRowsTuple) => {
        const [localDocs, remoteDocs] = localNremoteDocs;
        const changedRows: DocSyncAction[] = localDocs.filter(l => 
            !!(remoteDocs.find(r => 
                    l.id === r.id && 
                    this.getRevInt(l.value.rev) < this.getRevInt(r.value.rev)
                )
            )
        ).map(doc => ({ state: 'update', id: doc.id }));

        const onlyLocalRows: DocSyncAction[] = localDocs.filter(l => 
            !(remoteDocs.find(r => l.id === r.id))
            ).map(doc => ({ state: 'delete', id: doc.id }));

        const onlyRemoteRows: DocSyncAction[] = remoteDocs.filter(r => 
            !(localDocs.find(l => r.id === l.id))
            ).map(doc => ({ state: 'add', id: doc.id }));

        return [...changedRows, ...onlyLocalRows, ...onlyRemoteRows];
    }
};