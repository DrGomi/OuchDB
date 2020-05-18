const OuchDB = require('../dist/main')['OuchDB'];
const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));

const fs = require('fs');
const fetch = require("node-fetch");

const mockCouchDB = require('../resources/test_server')['couch'];
mockCouchDB.listen(3000, '127.0.0.3');

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
  'turtles_crud_1',
//   'turtles_crud_2',
//   'turtles_crud_3',
//   'turtles_crud_4'
];

const dbSetup = (index) => {
  const pouch = new PouchDB(sqliteNames[index], {adapter: 'websql'});
  const webSQLDB = openDatabase(sqliteNames[index], '1', 'blah', 1);
  const ouch = new OuchDB(webSQLDB, caller);
  return [ pouch, ouch, webSQLDB ];
}



afterAll(() =>  {
  mockCouchDB.close();
  sqliteNames.forEach(db => fs.unlinkSync(db));
})



it('gets same document via "ouch.get()" as via "pouch.get()"', () => {
    expect.assertions(1);
    const [ pouch, ouch ] = dbSetup(0);
    return pouch.load(dump)
    .then(() => pouch.get("raphael"))
    .then(info => console.log(info))
    .then(() => Promise.all([
        pouch.get("leonardo"),
        ouch.get("leonardo"),
    ]))
    .then(docs => {
        console.log(docs)
        expect(docs[0]).toEqual(docs[1]);
    })
});
