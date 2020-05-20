const OuchDB = require('../dist/main')['OuchDB'];
const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));

const fetch = require("node-fetch");

const pouch = new PouchDB('turtles', {adapter: 'websql'});


const webSQLDB = openDatabase('turtles', '1', 'pouch turtles', 1);
const ouch = new OuchDB(webSQLDB);

const log = (x) => console.log(x);
const tap = (x) => {
    console.log(x);
    return x;
}
const dump = `{"version":"1.2.6","db_type":"http","start_time":"2016-04-26T03:46:38.779Z","db_info":{"doc_count":4,"update_seq":4,"sqlite_plugin":false,"websql_encoding":"UTF-8","db_name":"turtles","auto_compaction":false,"adapter":"http","instance_start_time":"1461637740203","host":"http://localhost:6984/turtles/"}}
{"docs":[{"name":"Donatello","weapon":"bo","bandana":"purple","_id":"donatello","_rev":"1-c2f9e6a91b946fb378d53c6a4dd6eaa2"},{"name":"Leonardo","weapon":"katana","bandana":"blue","_id":"leonardo","_rev":"1-c95202ca170be0318d085b33528f7995"},{"name":"Michelangelo","weapon":"nunchaku","bandana":"orange","_id":"michelangelo","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Raphael","weapon":"sai","bandana":"red","_id":"raphael","_rev":"1-77812e9da146bc18a37e51efb063dbac"}]}
{"seq":4}`;

const caller = { 
    get: url => new Promise((resolve, reject) => 
        fetch(url)
        .then(res => resolve(res.json()))
        .catch(err => reject('error', err))
    )
};

const getInfo = (db) => new Promise((resolve, reject) => 
    db.transaction(tx =>
        tx.executeSql(
            'PRAGMA database_list',
            [],
            (tx, res) => resolve(res),
            (tx, err) => reject(err)
        )
    )
);

// pouch.load('http://127.0.0.1:5500/resources/turtles.txt')
pouch.load(dump)
.then(() => pouch.info())
// .then(info => console.log(info))
.then(() => getInfo(webSQLDB))
.then(res => console.log(webSQLDB._db._db))
// .then(res => console.log(res.rows.length))
// .then(x => log(x[1]['rows']['_array'].map(y => y['tbl_name'])))
// .then(() => ouch.getTables())
// .then(x => log(x.length))
// .then(() => ouch.dropFunnyTables("by-sequence"))
// .then(() => ouch.getTables("by-sequence"))
// .then(x => log(x))
// .then(() => ouch.getRemoteDoc("splinter", caller))
// .then(tap)
// // .then(doc => ouch.getTx().then(tx => ouch.updateSyncAction(tx, doc)))
// .then(doc => ouch.getTx().then(tx => ouch.deleteSyncAction(tx, 'splinter')))
// .then(tap)
.catch(log)

