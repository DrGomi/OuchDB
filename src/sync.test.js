const OuchDB = require('../dist/main')['OuchDB'];
const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));
const fs = require('fs');
const fetch = require("node-fetch");

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

const ouch = new OuchDB(webSQLDB, caller);

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
        const onlyRows = allDBDocs.map(ouch.getCleanAllDocRows);
        const docDiff = ouch.compareWithRemote(onlyRows);
        expect(docDiff.length).toEqual(4);
        expect(docDiff).toContainEqual({ state: 'update', id: 'donatello' });
        expect(docDiff).toContainEqual({ state: 'update', id: 'michelangelo' });
        expect(docDiff).toContainEqual({ state: 'delete', id: 'raphael' });
        expect(docDiff).toContainEqual({ state: 'add', id: 'splinter' });
        expect(docDiff.map(i => i.id)).not.toContainEqual('leonardo');
    })
  });


it('requests doc from remote endpoint', () => {
    expect.assertions(2);

    return ouch.getRemoteDoc('splinter')
    .then(res => expect(res._id).toMatch('splinter'))
    .then(() =>
        expect(ouch.getRemoteDoc('mickey'))
        .rejects.toBeDefined()
    )
  });

it('requests all_docs from remote endpoint', () => {
    expect.assertions(1);
    return ouch.getAllRemoteDocs()
    .then(res => {
      const remoteRows = res.rows.filter(row => row.id !== '_design/access');
      expect(remoteRows.length).toBe(4);
    })
  });

  it('fetches full docs to enrich sync actions', () => {
    expect.assertions(5);
    const docActions = [
      { state: 'update', id: 'donatello' },
      { state: 'update', id: 'michelangelo' },
      { state: 'add', id: 'splinter' },
      { state: 'delete', id: 'raphael' }
    ];
    return ouch.getRemoteDocs4SyncActions(docActions)
    .then(eActions =>  {
      expect(eActions.length).toBe(4);
      expect(eActions.find(x => x.id == 'donatello').doc).toBeDefined()
      expect(eActions.find(x => x.id == 'michelangelo').doc).toBeDefined()
      expect(eActions.find(x => x.id == 'splinter').doc).toBeDefined()
      expect(eActions.find(x => x.id == 'raphael').doc).not.toBeDefined()
    })
  });

  it('applies given doc sync actions to local db', () => {
    expect.assertions(8);

    const docActions =       [
      { state: 'update', id: 'donatello', doc: { name: 'Donatello', weapon: 'pizza-knife', bandana: 'purple', _id: 'donatello', _rev: '5-b587bb2575475e3e50c7807c404d4d49' } },
      { state: 'update', id: 'michelangelo', doc: { name: 'Michelangelo', weapon: 'bar', bandana: 'orange', _id: 'michelangelo', _rev: '3-c4902caddb145cfb9ec444d49a12d7cf' } },
      { state: 'add', id: 'splinter', doc: { name: 'Splinter', weapon: 'stick', bandana: 'brown', _id: 'splinter', _rev: '1-g2b746e11c7f4011483289337ca2dfe3' } },
      { state: 'delete', id: 'raphael' }
    ]
    return ouch.getAllRows()
    .then(allRows => {
      const rows = allRows[1].rows._array;
      expect(rows.find(x => x.doc_id == 'donatello').json).toMatch('"weapon":"bo"');
      expect(rows.find(x => x.doc_id == 'michelangelo').json).toMatch('"weapon":"nunchaku"');
      expect(!!rows.find(x => x.doc_id == 'raphael')).toBeTruthy();
      expect(!!rows.find(x => x.doc_id == 'splinter')).not.toBeTruthy();
    })
    .then(() => ouch.processSyncActions(docActions))
    .then(result => {
      console.log(result.map(x => x[1]));
      return ouch.getAllRows()
    })
    .then(allRows => {
      const rows = allRows[1].rows._array;
      expect(rows.find(x => x.doc_id == 'donatello').json).toMatch('"weapon":"pizza-knife"');
      expect(rows.find(x => x.doc_id == 'michelangelo').json).toMatch('"weapon":"bar"');
      expect(!!rows.find(x => x.doc_id == 'raphael')).not.toBeTruthy();
      expect(!!rows.find(x => x.doc_id == 'splinter')).toBeTruthy();
    })
  });


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