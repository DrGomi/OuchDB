const OuchDB = require('../dist/main')['OuchDB'];
const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));

const fs = require('fs');
const fetch = require("node-fetch");

const mockCouchDB = require('../resources/test_server')['couch'];
mockCouchDB.listen(3000, '127.0.0.2');

const caller = { 
    get: url => new Promise((resolve, reject) => 
        fetch(url)
        .then(res => resolve(res.json()))
        .catch(err => reject('error', err))
    )
};

const dump = `{"version":"1.2.6","db_type":"http","start_time":"2016-04-26T03:46:38.779Z","db_info":{"doc_count":4,"update_seq":4,"sqlite_plugin":false,"websql_encoding":"UTF-8","db_name":"turtles","auto_compaction":false,"adapter":"http","instance_start_time":"1461637740203","host":"http://localhost:6984/turtles/"}}
{"docs":[{"name":"Donatello","weapon":"bo","bandana":"purple","_id":"donatello","_rev":"1-c2f9e6a91b946fb378d53c6a4dd6eaa2"},{"name":"Leonardo","weapon":"katana","bandana":"blue","_id":"leonardo","_rev":"1-c95202ca170be0318d085b33528f7995"},{"name":"Michelangelo","weapon":"nunchaku","bandana":"orange","_id":"michelangelo","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Raphael","weapon":"sai","bandana":"red","_id":"raphael","_rev":"1-77812e9da146bc18a37e51efb063dbac"}]}
{"seq":4}`;


const sqliteNames = [
  'turtles_load_1',
  'turtles_load_2',
  'turtles_load_3',
  'turtles_load_4'
];

const dbSetup = (index) => {
  const pouch = new PouchDB(sqliteNames[index], {adapter: 'websql'});
  const webSQLDB = openDatabase(sqliteNames[index], '1', 'blah', 1);
  const ouch = new OuchDB(webSQLDB, caller);
  return [ pouch, ouch, webSQLDB ];
}


const getTables = (db) => new Promise((resolve, reject) => 
    db.transaction(tx =>
        tx.executeSql(
            'SELECT tbl_name from sqlite_master WHERE type = "table"',
            [],
            (tx, res) => resolve(res),
            (tx, err) => reject(err)
        )
    )
);

// const getInfo = (db) => new Promise((resolve, reject) => 
//     db.transaction(tx =>
//         tx.executeSql(
//             'SELECT COUNT(*) as "rowCount" FROM "by-sequence"',
//             [],
//             (tx, res) => resolve(res),
//             (tx, err) => reject(err)
//         )
//     )
// );

afterAll(() =>  {
  mockCouchDB.close();
  sqliteNames.forEach(db => fs.unlinkSync(db));
})



it('loads dump into pouchdb', () => {
    expect.assertions(4);
    const [ pouch, ouch, webSQLDB ] = dbSetup(0);
    return pouch.load(dump)
    // .then(() => getInfo(webSQLDB))
    // .then(info => console.log(info.rows._array))
    .then(() => ouch.getLocalAllDocs())
    .then(allDocs => {
        const allDocsKeys = Object.keys(allDocs);
        expect(allDocsKeys).toContain('total_rows');
        expect(allDocsKeys).toContain('offset');
        expect(allDocsKeys).toContain('rows');
        expect(allDocs.total_rows).toEqual(allDocs.rows.length);
    })
});

it('initializes "by-sequence" table in SQLite by calling "load()" on OuchDB', () => {
    expect.assertions(3);
    const webSQLDB = openDatabase(sqliteNames[1], '1', 'blah', 1);
    return getTables(webSQLDB)
    .then(allTables => {
        const tableNames = allTables.rows._array;
        expect(tableNames.length).toBe(0);
        const ouch = new OuchDB(webSQLDB, caller);
        return ouch.load(dump)
    })
    .then(() => getTables(webSQLDB))
    .then(allTables => {
        const tableNames = allTables.rows._array;
        expect(tableNames[0].tbl_name).toBe("by-sequence");
        expect(tableNames.length).toBe(1);
        return getTables(webSQLDB)
    })
    .catch(err => console.log('ERROR: ', err))
});

it('inserts all rows from provided dump string into "by-sequence" table ', () => {
    expect.assertions(6);
    const webSQLDB = openDatabase(sqliteNames[2], '1', 'blah', 1);
    const ouch = new OuchDB(webSQLDB, caller);
    return ouch.getAllRows()
    .catch(error => {
        expect(error).toBeDefined();
        return ouch.load(dump)
    })
    .then(() => ouch.getAllRows())
    .then(allRows => {
        const rows = allRows[1].rows._array;
        // console.log(rows)
        const row_ids = rows.map(r => r.doc_id);
        expect(rows.length).toBe(4);
        expect(row_ids).toContain('donatello');
        expect(row_ids).toContain('michelangelo');
        expect(row_ids).toContain('leonardo');
        expect(row_ids).toContain('raphael');
    })
});

it('show same output from pouch.info() & ouchdb.info()', () => {
    expect.assertions(1);
    const [ pouch, ouch ] = dbSetup(3);
    return pouch.load(dump)
    .then(() => Promise.all([
        pouch.info(),
        ouch.info()
    ]))
    .then(infos => {
        expect(infos[0]).toEqual(infos[1]);
    })
});