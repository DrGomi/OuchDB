// from : https://github.com/expo/expo/tree/master/packages/expo-sqlite/src
import { 
    Query,
    Window,
    Database,
    SQLiteCallback,
    // ResultSet,
    ResultSetRow,
    SQLTransaction,
    SQLResultSet,
    SQLError,
    TxCallback,

} from './SQLite.types';
// import { Window, Database } from './WebSQL.types';

import { PouchDBRow } from './PouchDB.types';

export class OuchDB {
    db: Database;
    httpFetch;

    constructor(dbName: string) {
        // SOQ/12709074/how-do-you-explicitly-set-a-new-property-on-window-in-typescript
        this.db = window['openDatabase'](dbName, '1', dbName, 2 * 1024 * 1024)
    }

    getTx = async(): Promise<SQLTransaction> => 
        new Promise((resolve, reject) => 
            this.db.transaction(
                (tx) => resolve(tx),
                (err) => reject(err),
            )
        );

    getAllRows = (table: string): Promise<TxCallback> => 
        this.getTx().then(tx => 
            new Promise((resolve, reject) =>   
                tx.executeSql(
                    `SELECT * FROM "${table}"`, 
                    [], 
                    (tx, res) => resolve([tx, res]),
                    (tx, err) => reject([tx, err])
                )
            )
        );

    mapDocRows = (res: SQLResultSet): ResultSetRow[] => 
        Object.keys(res.rows).map(_ => res.rows[_]);
    
    getRevInt =(inRev: string): number => 
        parseInt(inRev.split('-')[0]);

    compareDocs = (leftDoc, rightDoc) =>
        leftDoc.doc_id !== rightDoc.doc_id 
            ? true 
            : leftDoc == rightDoc || 
               this.getRevInt(leftDoc.rev) > this.getRevInt(rightDoc.rev);

    filterOldRevs = (origSeq: ResultSetRow[]): ResultSetRow[] => 
        origSeq.reduce<ResultSetRow[]>((acc, iter) => 
            ([...acc, iter].filter(x => this.compareDocs(x, iter))), []);

    deleteRev = (tx, doc) =>  new Promise((resolve, reject) => 
            tx.executeSql(
                `DELETE FROM "by-sequence" WHERE doc_id = "${doc.doc_id}" AND rev = "${doc.rev}"`,
                [],
                () => resolve(),
                (err) => reject(err)
            )
    );
  
    killOldRevs = ( origSeq, filterSeq) => 
        this.getTx().then(tx => 
            origSeq
            .filter(x => !filterSeq.includes(x))
            .forEach(x => this.deleteRev(tx, x))
        );

    // getTables = (tx: SQLTransaction): Promise<TxCallback> =>  new Promise((resolve, reject) => 
    //         tx.executeSql(
    //             'SELECT tbl_name from sqlite_master WHERE type = "table"',
    //             [],
    //             (tx, res) => resolve([tx, res]),
    //             (tx, err) => reject([tx, err])
    //         )
    // );

    drobTable = (tx: SQLTransaction, tableName: string) => new Promise((resolve, reject) =>
        tx.executeSql(
            `DROP TABLE "${tableName}"`,
            [],
            (tx, res) => {
                console.log(`DROOOOP'D ${tableName}`);
                resolve([tx, res]);
            },
            (tx, err) => {
                console.log(`NOOOOO ${tableName}`, err);
                reject([tx, err]);
            }
            )
        );

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
            ).then(() => {
                console.log('DROPPED IT LIKE IT\'S HOT!');
                return Promise.resolve(tx);
            })
        );
};