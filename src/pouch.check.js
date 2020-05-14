const OuchDB = require('../dist/main')['OuchDB'];
const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));

const db = new PouchDB('turtles', {adapter: 'websql'});


const webSQLDB = openDatabase('turtles', '1', 'pouch turtles', 1);
const ouch = new OuchDB(webSQLDB);

const log = (x) => console.log(x);
const tap = (x) => {
    console.log(x);
    return x;
}


db.load('http://127.0.0.1:5500/resources/turtles.txt')
.then(() => db.info())
// .then(info => info.doc_count)
// .then(x => log(x[1]['rows']['_array'].map(y => y['tbl_name'])))
.then(() => ouch.getTables())
.then(x => log(x.length))
.then(() => ouch.dropFunnyTables("by-sequence"))
.then(() => ouch.getTables("by-sequence"))
.then(x => log(x))
.catch(err => console.log(err))
