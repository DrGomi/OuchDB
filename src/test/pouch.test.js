import { OuchDB } from '../../dist/main';

const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));
const fs = require('fs');

const dump = `{"version":"1.2.6","db_type":"http","start_time":"2016-04-26T03:46:38.779Z","db_info":{"doc_count":4,"update_seq":4,"sqlite_plugin":false,"websql_encoding":"UTF-8","db_name":"turtles","auto_compaction":false,"adapter":"http","instance_start_time":"1461637740203","host":"http://localhost:6984/turtles/"}}
{"docs":[{"name":"Donatello","weapon":"bo","bandana":"purple","_id":"donatello","_rev":"1-c2f9e6a91b946fb378d53c6a4dd6eaa2"},{"name":"Leonardo","weapon":"katana","bandana":"blue","_id":"leonardo","_rev":"1-c95202ca170be0318d085b33528f7995"},{"name":"Michelangelo","weapon":"nunchaku","bandana":"orange","_id":"michelangelo","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Raphael","weapon":"sai","bandana":"red","_id":"raphael","_rev":"1-77812e9da146bc18a37e51efb063dbac"}]}
{"seq":4}`

const sqliteName = 'turtles_1'
const pouch = new PouchDB(sqliteName, {adapter: 'websql'});
// pouch.info().then(x => console.log(x));
const updateWeapon = (name, arm) =>
  pouch.get(name).then(itm => pouch.put({...itm, ...{ weapon: arm }}));

const webSQLDB = openDatabase(sqliteName, '1', 'pouch turtles', 1);

const ouch = new OuchDB(webSQLDB);

beforeAll(() => pouch.load(dump));

afterAll(() => fs.unlinkSync(sqliteName) )

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
    expect.assertions(3);
    return ouch.getTables()
    .then(rows => {
        expect(rows.length).toEqual(7)
        return ouch.dropFunnyTables("by-sequence");
    })
    .then(() => ouch.getTables())
    .then(x => {
        expect(x).toContain('by-sequence');
        expect(x).toContain('sqlite_sequence');
    })
  });