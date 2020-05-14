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
// import { Window, Database } from './WebSQL.types';

// import { PouchDBRow } from './PouchDB.types';

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
    compareDocs = (left: PouchDBRow, right: PouchDBRow) =>
        left.doc_id !== right.doc_id 
            ? true 
            : left == right || 
              this.getRevInt(left.rev) > this.getRevInt(right.rev);

    // returns unique rows with the highest revision id
    filterOldRevs = (origSeq: PouchDBRow[]): PouchDBRow[] => 
        origSeq.reduce<PouchDBRow[]>(
            (acc, iter) => (   // add iter to acc...
                [...acc, iter] // ...and filter iter/older doc (with same id) out
                .filter(x => this.compareDocs(x, iter))
            ),[]);

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

    // retrives all docs & deletes old versions of docs from table
    pruneRevs = () => 
        this.getAllRows()
        .then(txNrs => {
            const [_, res] = txNrs;
            const origSeq: PouchDBRow[] = this.mapDocRows(res);
            const filterSeq: PouchDBRow[] = this.filterOldRevs(origSeq);
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
};