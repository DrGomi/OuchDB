// import { OuchDB } from '../../dist/main';

// const openDatabase = require('websql');
// const PouchDB = require('pouchdb');
// PouchDB.plugin(require('pouchdb-load'));
// PouchDB.plugin(require('pouchdb-adapter-node-websql'));
const fs = require('fs');

const pouchDump = require('./test_utils')['turtlePouchDump'];
const dbSetup = require('./test_utils')['dbSetup'];

const sqliteNames = [
  'turtles_pouch_1',
  // 'turtles_pouch_2'
];

// const pouch = new PouchDB(sqliteName, {adapter: 'websql'});
// pouch.info().then(x => console.log(x));
const updateWeapon = (name, arm) =>
  pouch.get(name).then(itm => pouch.put({...itm, ...{ weapon: arm }}));

// const webSQLDB = openDatabase(sqliteName, '1', 'pouch turtles', 1);

// const ouch = new OuchDB(webSQLDB);

const [ pouch, ouch ] = dbSetup(sqliteNames[0]);

beforeAll(() => pouch.load(pouchDump));

afterAll(() =>  {
  sqliteNames.forEach(db => fs.unlinkSync(db));
})

it('creates successfully PouchDB & OuchDB', () => {
    expect.assertions(2);
    expect(pouch).toBeDefined()
    return expect(ouch).toBeDefined()
  });

it('loads dump file from dev-server into PouchDB', () => {
    expect.assertions(1);
    return pouch.info()
    .then(info => expect(info.doc_count).toEqual(4))
  });


it('returns all tables from PouchDB', () => {
    expect.assertions(2);
    return ouch.getTables()
    .then(tbls =>  {
        expect(tbls).toContain("by-sequence");
        expect(tbls.length).toEqual(7);
    })
  });


it('maps all rows from "by-sequence" into an array', () => {
    expect.assertions(2);
    
    return Promise.all([
        updateWeapon('michelangelo', 'foo')
        .then(() => updateWeapon('michelangelo', 'bar')),
        updateWeapon('raphael', 'sausage'),
        updateWeapon('donatello', 'poop')
        .then(() => updateWeapon('donatello', 'poop'))
        .then(() => updateWeapon('donatello', 'pizza'))
    ])
    .then(() => ouch.getAllRows("by-sequence"))
    .then(txNrs => {
        const rowNb = ouch.mapDocRows(txNrs[1]).length;
        // console.log(ouch.mapDocRows(txNrs[1]))
        expect(rowNb).toEqual(10);
        return ouch.pruneOldLocalRevs()
    })
    .then(() => ouch.getAllRows("by-sequence"))
    .then(txNrs => {
      const rowNb = ouch.mapDocRows(txNrs[1]).length;
      expect(rowNb).toEqual(4);
    })
  });


  it('drops all uneccessary tables from PouchDB', () => {
    expect.assertions(4);

    return ouch.getTables()
    .then(rows => {
        expect(rows.length).toEqual(7)
        return ouch.dropFunnyTables("by-sequence");
    })
    .then(() => ouch.getTables())
    .then(tables => {
        // console.log(tables);
        expect(tables.length).toEqual(2);
        expect(tables).toContain('by-sequence');
        expect(tables).toContain('sqlite_sequence');
    })
  });