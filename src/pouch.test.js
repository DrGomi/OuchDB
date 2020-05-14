const OuchDB = require('../dist/main')['OuchDB'];
const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));

let pouch = new PouchDB(':turtles:', {adapter: 'websql'});
const updateWeapon = (name, arm) =>
  pouch.get(name).then(itm => pouch.put({...itm, ...{ weapon: arm }}));

const webSQLDB = openDatabase(':turtles:', '1', 'pouch turtles', 1);

const ouch = new OuchDB(webSQLDB);

beforeAll(() => {
    return pouch.destroy()
    .then(() => {
      pouch = new PouchDB(':turtles:', {adapter: 'websql'});
    })
    .then(() => pouch.load('http://127.0.0.1:5500/resources/turtles.txt'))
  });


it('creates successfully PouchDB & OuchDB', () => {
    expect.assertions(2);
    expect(pouch).toBeDefined()
    return expect(ouch).toBeDefined()
  });

it('loads dump file from dev-server into PouchDB', () => {
    expect.assertions(1);
    return expect(
        pouch.info()
        .then(info => info.doc_count)
    ).resolves.toEqual(4);
  });


it('returns all tables from PouchDB', () => {
    expect.assertions(2);
    expect(
      ouch.getTables()
    ).resolves.toContain("by-sequence");
    return expect(
      ouch.getTables().then(rows => rows.length)
    ).resolves.toEqual(7);
  });


it('maps all rows from "by-sequence" into an array', () => {
    expect.assertions(2);
    // return expect(
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
        const [_, res] = txNrs;
        const origSeq = ouch.mapDocRows(res);
        expect(origSeq.length).toEqual(10);
        const filterSeq = ouch.filterOldRevs(origSeq);
        // expect(filterSeq.length).toEqual(4;
        return ouch.killOldRevs(origSeq, filterSeq)
      })
      .then(() => ouch.getAllRows("by-sequence"))
      .then(txNrs => ouch.mapDocRows(txNrs[1]).length)
      // .then(rows => rows.length)
      .then(x => expect(x).toEqual(4))
    // ).resolves.toEqual(4);
  });


it('drops all uneccessary tables from PouchDB', () => {
    expect.assertions(3);

    expect(
      ouch.getTables().then(rows => rows.length)
    ).resolves.toEqual(7);

    return ouch.dropFunnyTables("by-sequence")
      .then(() => ouch.getTables())
      .then(x => {
        expect(x).toContain('by-sequence');
        expect(x).toContain('sqlite_sequence');
      })
    // ).resolves.toEqual([ 'by-sequence', 'sqlite_sequence' ]);
  });