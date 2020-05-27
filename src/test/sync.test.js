const mockCouchDB = require('./test_utils')['mockCouchDB'];
const dump = require('./test_utils')['turtleDump'];
const dbSetup = require('./test_utils')['dbSetup'];
// const caller = require('./test_utils')['caller']; 

const fs = require('fs');

const couchDBPort = 3300;
const couchDBIP = '127.0.0.11'
const remoteDB = `http://${couchDBIP}:${couchDBPort}`;
mockCouchDB.listen(couchDBPort , couchDBPort);



const allRemoteDocs = {
    total_rows: 5,
    offset: 0,
    rows: [
    { id:"_design/access", key:"_design/access", value: { rev:"1-451e825a7ec62a68a2a7576cd3d14ad2" }},
    { id:"donatello", key:"donatello", value: { rev:"5-b587bb2575475e3e50c7807c404d4d49" }},
    { id:"leonardo", key:"leonardo", value: { rev:"1-c95202ca170be0318d085b33528f7995" }},
    { id:"michelangelo", key:"michelangelo", value: { rev:"3-c4902caddb145cfb9ec444d49a12d7cf" }},
    { id:"splinter", key:"splinter", value: { rev:"1-g2b746e11c7f4011483289337ca2dfe3" }}
    ]
};

const sqliteNames = [
  'turtles_sync_1',
  'turtles_sync_2',
  'turtles_sync_3',
  'turtles_sync_4',
  'turtles_sync_5',
  'turtles_sync_6',
  'turtles_sync_7',
  'turtles_sync_8'
];

afterAll(() =>  {
  mockCouchDB.close();
  sqliteNames.forEach(db => fs.unlinkSync(db));
})

it('transforms local db rows into CouchDB compatible _all_docs format', () => {
    expect.assertions(4);
    const [ pouch, ouch ] = dbSetup(sqliteNames[0]);
    return pouch.load(dump)
    .then(() => ouch.getLocalAllDocs())
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

    const [ pouch, ouch ] = dbSetup(sqliteNames[1]);
    return pouch.load(dump)
    .then(() => {
        expect(allRemoteDocs === Object(allRemoteDocs)).toBeTruthy()
        const cleanDocs = ouch.getCleanAllDocRows(allRemoteDocs);
        expect(Array.isArray(cleanDocs)).toBeTruthy()
        const docIds = cleanDocs.map(x => x.id);
        expect(docIds).not.toContain("_design/access");
    })
  });


it('compares local with remote docs & returns list with sync actions', () => {
    expect.assertions(6);

    const [ pouch, ouch ] = dbSetup(sqliteNames[2]);
    return pouch.load(dump)
    .then(() => Promise.all([
        ouch.getLocalAllDocs(),
        ouch.getAllRemoteRevs(remoteDB)
        // Promise.resolve(allRemoteDocs)
      ])
    )
    .then(allDBDocs => {
        const onlyRows = allDBDocs.map(ouch.getCleanAllDocRows);
        // console.log(allDBDocs)
        // console.log(onlyRows)
        const docDiff = ouch.compareWithRemote(onlyRows);
        expect(docDiff.length).toEqual(4);
        expect(docDiff).toContainEqual({ state: 'update', id: 'donatello' });
        expect(docDiff).toContainEqual({ state: 'update', id: 'michelangelo' });
        expect(docDiff).toContainEqual({ state: 'delete', id: 'raphael' });
        expect(docDiff).toContainEqual({ state: 'add', id: 'splinter' });
        expect(docDiff.map(i => i.id)).not.toContainEqual('leonardo');
    })
  });

it('compares local with remote docs & returns list with sync actions', () => {
    expect.assertions(6);

    const [ pouch, ouch ] = dbSetup(sqliteNames[2]);
    return pouch.load(dump)
    .then(() => ouch.diffDocsWithRemote(remoteDB))
    .then(docDiff => {
        // const onlyRows = allDBDocs.map(ouch.getCleanAllDocRows);
        // // console.log(allDBDocs)
        // // console.log(onlyRows)
        // const docDiff = ouch.compareWithRemote(onlyRows);
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

    const [ pouch, ouch ] = dbSetup(sqliteNames[3]);
    // return pouch.load(dump)
    // .then(() => ouch.getRemoteDoc('splinter'))
    return ouch.getRemoteDoc(remoteDB,'splinter')
    .then(res => expect(res._id).toMatch('splinter'))
    .then(() =>
        expect(ouch.getRemoteDoc('mickey'))
        .rejects.toBeDefined()
    )
  });

it('requests all_docs from remote endpoint', () => {
    expect.assertions(1);
    const [ pouch, ouch ] = dbSetup(sqliteNames[4]);
    // return pouch.load(dump)
    return ouch.getAllRemoteDocs(remoteDB)
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

    const [ pouch, ouch ] = dbSetup(sqliteNames[5]);
    return pouch.load(dump)
    .then(() => ouch.getRemoteDocs4SyncActions(remoteDB, docActions))
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

    const docActions = [
      { state: 'update', id: 'donatello', doc: { name: 'Donatello', weapon: 'pizza-knife', bandana: 'purple', _id: 'donatello', _rev: '5-b587bb2575475e3e50c7807c404d4d49' } },
      { state: 'update', id: 'michelangelo', doc: { name: 'Michelangelo', weapon: 'bar', bandana: 'orange', _id: 'michelangelo', _rev: '3-c4902caddb145cfb9ec444d49a12d7cf' } },
      { state: 'add', id: 'splinter', doc: { name: 'Splinter', weapon: 'stick', bandana: 'brown', _id: 'splinter', _rev: '1-g2b746e11c7f4011483289337ca2dfe3' } },
      { state: 'delete', id: 'raphael' }
    ]
    const [ pouch, ouch ] = dbSetup(sqliteNames[6]);
    return pouch.load(dump)
    .then(() => ouch.getAllRows())
    .then(allRows => {
      const rows = allRows[1].rows._array;
      expect(rows.find(x => x.doc_id == 'donatello').json).toMatch('"weapon":"bo"');
      expect(rows.find(x => x.doc_id == 'michelangelo').json).toMatch('"weapon":"nunchaku"');
      expect(!!rows.find(x => x.doc_id == 'raphael')).toBeTruthy();
      expect(!!rows.find(x => x.doc_id == 'splinter')).not.toBeTruthy();

      return ouch.processSyncActions(remoteDB, docActions);
    })
    .then(() => ouch.getAllRows())
    .then(allRows => {
      const rows = allRows[1].rows._array;
      expect(rows.find(x => x.doc_id == 'donatello').json).toMatch('"weapon":"pizza-knife"');
      expect(rows.find(x => x.doc_id == 'michelangelo').json).toMatch('"weapon":"bar"');
      expect(!!rows.find(x => x.doc_id == 'raphael')).not.toBeTruthy();
      expect(!!rows.find(x => x.doc_id == 'splinter')).toBeTruthy();
    })
  });

  it('applies no sync actions to local db when given an empty doc', () => {
    expect.assertions(8);

    const docActions = [];

    const [ pouch, ouch ] = dbSetup(sqliteNames[7]);
    return pouch.load(dump)
    .then(() => ouch.getAllRows())
    .then(allRows => {
      const rows = allRows[1].rows._array;
      expect(rows.find(x => x.doc_id == 'donatello').json).toMatch('"weapon":"bo"');
      expect(rows.find(x => x.doc_id == 'michelangelo').json).toMatch('"weapon":"nunchaku"');
      expect(!!rows.find(x => x.doc_id == 'raphael')).toBeTruthy();
      expect(!!rows.find(x => x.doc_id == 'splinter')).not.toBeTruthy();
      return ouch.getRemoteDocs4SyncActions(remoteDB, docActions);
    })
    .then(actions => ouch.processSyncActions(remoteDB, actions))
    .then(() => ouch.getAllRows())
    .then(allRows => {
      // console.log(allRows[1].rows._array);
      const rows = allRows[1].rows._array;
      expect(rows.find(x => x.doc_id == 'donatello').json).toMatch('"weapon":"bo"');
      expect(rows.find(x => x.doc_id == 'michelangelo').json).toMatch('"weapon":"nunchaku"');
      expect(!!rows.find(x => x.doc_id == 'raphael')).toBeTruthy();
      expect(!!rows.find(x => x.doc_id == 'splinter')).not.toBeTruthy();
    })
  });
