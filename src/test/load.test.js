import { OuchDB } from '../../dist/main';
const mockCouchDB = require('./test_utils')['mockCouchDB'];
const dump = require('./test_utils')['turtleDump'];
const dbSetup = require('./test_utils')['dbSetup'];
const getTables = require('./test_utils')['getTables'];

const openDatabase = require('websql');
// const PouchDB = require('pouchdb');
// PouchDB.plugin(require('pouchdb-load'));
// PouchDB.plugin(require('pouchdb-adapter-node-websql'));

const fs = require('fs');

mockCouchDB.listen(3000, '127.0.0.22');

const caller = require('./test_utils')['caller']; 

const sqliteNames = [
  'turtles_load_1',
  'turtles_load_2',
  'turtles_load_3',
  'turtles_load_4',
  'turtles_load_5'
];

afterAll(() =>  {
  mockCouchDB.close();
  sqliteNames.forEach(db => fs.unlinkSync(db));
})



it('loads dump into pouchdb', () => {
    expect.assertions(4);
    const [ pouch, ouch, webSQLDB ] = dbSetup(sqliteNames[0]);
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
        const tableNb = allTables.rows.length;
        expect(tableNb).toBe(0);
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
        // console.log(error);
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
    const [ pouch, ouch ] = dbSetup(sqliteNames[3]);
    return pouch.load(dump)
    .then(() => Promise.all([
        pouch.info(),
        ouch.info()
    ]))
    .then(infos => {
        expect(infos[0]).toEqual(infos[1]);
    })
});

it('inits "by-sequence" table via ouchdb.info() if neccessary', () => {
    expect.assertions(1);
    const webSQLDB = openDatabase(sqliteNames[4], '1', 'blah', 1);
    const ouch = new OuchDB(webSQLDB, caller);
    return ouch.info()
    .then(infos => {
        console.log(infos)
        expect(infos).toBeDefined();
    })
});