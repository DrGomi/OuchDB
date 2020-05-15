const OuchDB = require('../dist/main')['OuchDB'];
const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));
const fs = require('fs');

const dump = `{"version":"1.2.6","db_type":"http","start_time":"2016-04-26T03:46:38.779Z","db_info":{"doc_count":4,"update_seq":4,"sqlite_plugin":false,"websql_encoding":"UTF-8","db_name":"turtles","auto_compaction":false,"adapter":"http","instance_start_time":"1461637740203","host":"http://localhost:6984/turtles/"}}
{"docs":[{"name":"Donatello","weapon":"bo","bandana":"purple","_id":"donatello","_rev":"1-c2f9e6a91b946fb378d53c6a4dd6eaa2"},{"name":"Leonardo","weapon":"katana","bandana":"blue","_id":"leonardo","_rev":"1-c95202ca170be0318d085b33528f7995"},{"name":"Michelangelo","weapon":"nunchaku","bandana":"orange","_id":"michelangelo","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Raphael","weapon":"sai","bandana":"red","_id":"raphael","_rev":"1-77812e9da146bc18a37e51efb063dbac"}]}
{"seq":4}`

const request = url => 
    fetch(url)
    .then(res => res.json())
    .then(json => Promise.resolve(json.rows))
    .catch(err => console.log(err));

const allRemoteDocs = {
    total_rows: 6,
    offset: 0,
    rows: [
    { id:"_design/access", key:"_design/access", value: { rev:"1-451e825a7ec62a68a2a7576cd3d14ad2" }},
    { id:"donatello", key:"donatello", value: { rev:"5-b587bb2575475e3e50c7807c404d4d49" }},
    { id:"leonardo", key:"leonardo", value: { rev:"1-c95202ca170be0318d085b33528f7995" }},
    { id:"michelangelo", key:"michelangelo", value: { rev:"3-c4902caddb145cfb9ec444d49a12d7cf" }},
    { id:"splinter", key:"splinter", value: { rev:"1-g2b746e11c7f4011483289337ca2dfe3" }}
    ]
};


const sqliteName = 'turtles_2'
const pouch = new PouchDB(sqliteName, {adapter: 'websql'});
const updateWeapon = (name, arm) =>
  pouch.get(name).then(itm => pouch.put({...itm, ...{ weapon: arm }}));

const webSQLDB = openDatabase(sqliteName, '1', 'pouch turtles', 1);

const ouch = new OuchDB(webSQLDB);

beforeAll(() => pouch.load(dump));

afterAll(() => fs.unlinkSync(sqliteName) )


it('creates successfully PouchDB & OuchDB', () => {
    expect.assertions(2);
    expect(pouch).toBeDefined();
    return expect(ouch).toBeDefined();
  });

it('transforms local db rows into CouchDB compatible _all_docs format', () => {
    expect.assertions(4);
    return ouch.getLocalAllDocs()
    .then(allDocs => {
        const allDocsKeys = Object.keys(allDocs);
        expect(allDocsKeys).toContain('total_rows');
        expect(allDocsKeys).toContain('offset');
        expect(allDocsKeys).toContain('rows');
        expect(allDocs.total_rows).toEqual(allDocs.rows.length);
    })
  });

it('maps _all_docs format to rows containing only docs', () => {
    expect.assertions(3);
    return Promise.resolve(allRemoteDocs)
    .then(allDocsResponse => {
        expect(allDocsResponse === Object(allDocsResponse)).toBeTruthy()
        const cleanDocs = ouch.getCleanAllDocRows(allDocsResponse);
        expect(Array.isArray(cleanDocs)).toBeTruthy()
        const docIds = cleanDocs.map(x => x.id);
        expect(docIds).not.toContain("_design/access");

    })
  });


it('compares local with remote docs & returns list with sync actions', () => {
    expect.assertions(6);
    return Promise.all([
        ouch.getLocalAllDocs(),
        Promise.resolve(allRemoteDocs)
    ])
    .then(allDBDocs => {
        const onlyRows = allDBDocs.map(ouch.getCleanAllDocRows)
        const docDiff = ouch.compareWithRemote(onlyRows);
        console.log(docDiff)
        expect(docDiff.length).toEqual(4);
        expect(docDiff).toContainEqual({ state: 'update', id: 'donatello' });
        expect(docDiff).toContainEqual({ state: 'update', id: 'michelangelo' });
        expect(docDiff).toContainEqual({ state: 'delete', id: 'raphael' });
        expect(docDiff).toContainEqual({ state: 'add', id: 'splinter' });
        expect(docDiff.map(i => i.id)).not.toContainEqual('leonardo');
    })
  });


// it('maps all rows from "by-sequence" into an array', () => {
//     expect.assertions(2);
//       return Promise.all([
//         updateWeapon('raphael', 'sausage'),
//         updateWeapon('michelangelo', 'foo')
//         .then(() => updateWeapon('michelangelo', 'bar')),
//         updateWeapon('donatello', 'poop')
//         .then(() => updateWeapon('donatello', 'poop'))
//         .then(() => updateWeapon('donatello', 'pizza'))
//       ])
//       .then(() => ouch.getAllRows("by-sequence"))
//       .then(txNrs => {
//         const [_, res] = txNrs;
//         const origSeq = ouch.mapDocRows(res);
//         expect(origSeq.length).toEqual(10);
//         const filterSeq = ouch.filterOldRevs(origSeq);
//         return ouch.killOldRevs(origSeq, filterSeq)
//       })
//       .then(() => ouch.getAllRows("by-sequence"))
//       .then(txNrs => ouch.mapDocRows(txNrs[1]).length)
//       .then(x => expect(x).toEqual(4))
//   });


// it('drops all uneccessary tables from PouchDB', () => {
//     expect.assertions(3);
//     return ouch.getTables()
//     .then(rows => {
//         expect(rows.length).toEqual(7)
//         return ouch.dropFunnyTables("by-sequence")
//     })
//     .then(() => ouch.getTables())
//     .then(x => {
//     expect(x).toContain('by-sequence');
//     expect(x).toContain('sqlite_sequence');
//     })
//   });