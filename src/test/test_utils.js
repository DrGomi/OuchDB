Object.defineProperty(exports, '__esModule', { value: true });

// const fetch = require("node-fetch");
import { OuchDB } from '../../dist/main';
const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));
const http = require('http');

const routers = {
    'splinter': { "name": "Splinter", "weapon": "stick", "bandana": "brown", "_id": "splinter", "_rev": "1-g2b746e11c7f4011483289337ca2dfe3" },
    'raphael': { "name": "Raphael", "weapon": "sausage", "bandana": "red", "_id": "raphael", "_rev": "2-32b746e11c7f4011483289337ca2dfe3" },
    'leonardo': { "name": "Leonardo", "weapon": "katana", "bandana": "blue", "_id": "leonardo", "_rev": "1-c95202ca170be0318d085b33528f7995" },
    'donatello': { "name": "Donatello", "weapon": "pizza-knife", "bandana": "purple", "_id": "donatello", "_rev": "5-b587bb2575475e3e50c7807c404d4d49" },
    'michelangelo': { "name": "Michelangelo", "weapon": "bar", "bandana": "orange", "_id": "michelangelo", "_rev": "3-c4902caddb145cfb9ec444d49a12d7cf" },
    '_all_docs?include_docs=true': {
        "total_rows":6,
        "offset":0,
        "rows":[
            {"id":"_design/access","key":"_design/access","value":{"rev":"1-451e825a7ec62a68a2a7576cd3d14ad2"},"doc":{"_id":"_design/access","_rev":"1-451e825a7ec62a68a2a7576cd3d14ad2","validate_doc_update":"function(){}"}},
            {"id":"donatello","key":"donatello","value":{"rev":"5-b587bb2575475e3e50c7807c404d4d49"},"doc":{"name":"Donatello","weapon":"pizza-knife","bandana":"purple","_id":"donatello","_rev":"5-b587bb2575475e3e50c7807c404d4d49"}},
            {"id":"leonardo","key":"leonardo","value":{"rev":"1-c95202ca170be0318d085b33528f7995"},"doc":{"name":"Leonardo","weapon":"katana","bandana":"blue","_id":"leonardo","_rev":"1-c95202ca170be0318d085b33528f7995"}},
            {"id":"michelangelo","key":"michelangelo","value":{"rev":"3-c4902caddb145cfb9ec444d49a12d7cf"},"doc":{"name":"Michelangelo","weapon":"bar","bandana":"orange","_id":"michelangelo","_rev":"3-c4902caddb145cfb9ec444d49a12d7cf"}},
            {"id":"splinter","key":"splinter","value":{"rev":"1-g2b746e11c7f4011483289337ca2dfe3"},"doc":{"name":"Splinter","weapon":"stick","bandana":"brown","_id":"splinter","_rev":"1-g2b746e11c7f4011483289337ca2dfe3"}}
        ]
    }
}

// Create an instance of the http server to handle HTTP requests
module.exports.mockCouchDB = http.createServer((req, res) => {
    // Set a response type of plain text for the response
    const validReq = routers[req.url.slice(1)];
    if(!!validReq){
        res.writeHead(200, {'Content-Type': 'json'});
        res.write(JSON.stringify(validReq));
        res.end();
    } else {
        res.writeHead(404, {'Content-Type': 'json'});
        res.end('BAD REQUEST!\n');
    }
});

module.exports.fetcher = { 
    get: url => new Promise((resolve, reject) => 
        fetch(url)
        .then(res => resolve(res.json()))
        .catch(err => reject('error', err))
    )
};

module.exports.turtleDump = `{"version":"1.2.6","db_type":"http","start_time":"2016-04-26T03:46:38.779Z","db_info":{"doc_count":4,"update_seq":4,"sqlite_plugin":false,"websql_encoding":"UTF-8","db_name":"turtles","auto_compaction":false,"adapter":"http","instance_start_time":"1461637740203","host":"http://localhost:6984/turtles/"}}
{"docs":[{"name":"Donatello","weapon":"bo","bandana":"purple","_id":"donatello","_rev":"1-c2f9e6a91b946fb378d53c6a4dd6eaa2"},{"name":"Leonardo","weapon":"katana","bandana":"blue","_id":"leonardo","_rev":"1-c95202ca170be0318d085b33528f7995"},{"name":"Michelangelo","weapon":"nunchaku","bandana":"orange","_id":"michelangelo","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Raphael","weapon":"sai","bandana":"red","_id":"raphael","_rev":"1-77812e9da146bc18a37e51efb063dbac"}]}
{"seq":4}`;


const caller = { 
    get: url => new Promise((resolve, reject) => 
        fetch(url)
        .then(res => resolve(res.json()))
        .catch(err => reject('error', err))
    )
};

module.exports.caller = caller; 

module.exports.dbSetup = (index) => {
    const pouch = new PouchDB(index, {adapter: 'websql'});
    const webSQLDB = openDatabase(index, '1', 'blah', 1);
    const ouch = new OuchDB(webSQLDB, caller);
    return [ pouch, ouch, webSQLDB ];
}

module.exports.getTables = (db) => new Promise((resolve, reject) => 
db.transaction(tx =>
    tx.executeSql(
        'SELECT tbl_name from sqlite_master WHERE type = "table"',
        [],
        (tx, res) => resolve(res),
        (tx, err) => reject(err)
    )
)
);