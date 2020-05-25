import { OuchDB } from '../../dist/main';
// const mockCouchDB = require('./couchdb_mock');
const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));

const fs = require('fs');
const fetch = require("node-fetch");

// mockCouchDB.listen(3000, '127.0.0.3');

// const dump = `{"version":"1.2.6","db_type":"http","start_time":"2016-04-26T03:46:38.779Z","db_info":{"doc_count":4,"update_seq":4,"sqlite_plugin":false,"websql_encoding":"UTF-8","db_name":"turtles","auto_compaction":false,"adapter":"http","instance_start_time":"1461637740203","host":"http://localhost:6984/turtles/"}}
// {"docs":[{"name":"Donatello","weapon":"bo","bandana":"purple","_id":"donatello","_rev":"1-c2f9e6a91b946fb378d53c6a4dd6eaa2"},{"name":"Leonardo","weapon":"katana","bandana":"blue","_id":"leonardo","_rev":"1-c95202ca170be0318d085b33528f7995"},{"name":"Michelangelo","weapon":"nunchaku","bandana":"orange","_id":"michelangelo","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Raphael","weapon":"sai","bandana":"red","_id":"raphael","_rev":"1-77812e9da146bc18a37e51efb063dbac"}]}
// {"seq":4}`;

const dumps = `{"version":"1.2.6","db_type":"http","start_time":"2016-04-26T03:46:38.779Z","db_info":{"doc_count":4,"update_seq":4,"sqlite_plugin":false,"websql_encoding":"UTF-8","db_name":"turtles","auto_compaction":false,"adapter":"http","instance_start_time":"1461637740203","host":"http://localhost:6984/turtles/"}}
{"docs":[{"name":"Donatello","weapon":"bo","bandana":"purple","_id":"turtle_donatello","_rev":"1-c2f9e6a91b946fb378d53c6a4dd6eaa2"},{"name":"Leonardo","weapon":"katana","bandana":"blue","_id":"turtle_leonardo","_rev":"1-c95202ca170be0318d085b33528f7995"},{"name":"Michelangelo","weapon":"nunchaku","bandana":"orange","_id":"turtle_michelangelo","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Raphael","weapon":"sai","bandana":"red","_id":"turtle_raphael","_rev":"1-77812e9da146bc18a37e51efb063dbac"},{"name":"Splinter","weapon":"stick","bandana":"brown","_id":"rat_splinter","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Bebop","weapon":"Pigfangs","bandana":"dirty","_id":"villain_Bebop","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Rocksteady","weapon":"Rhinohorn","bandana":"grey","_id":"villain_Rocksteady","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Krang","weapon":"slime","bandana":"pink","_id":"villain_Krang","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Shredder","weapon":"bladeglowes","bandana":"silver","_id":"villain_shredder","_rev":"1-77812e9da146bc18a37e51efb063dbac"}]}
{"seq":9}`;


const sqliteNames = [ 'turtles_get_1' ];

const dbSetup = (index) => {
    const caller = { 
        get: url => new Promise((resolve, reject) => 
            fetch(url)
            .then(res => resolve(res.json()))
            .catch(err => reject('error', err))
        )
    };
    const pouch = new PouchDB(sqliteNames[index], {adapter: 'websql'});
    const webSQLDB = openDatabase(sqliteNames[index], '1', 'blah', 1);
    const ouch = new OuchDB(webSQLDB, caller);
    return [ pouch, ouch, webSQLDB ];
}


const [ pouch, ouch ] = dbSetup(0);


beforeAll(() =>  {
    return pouch.load(dumps);
})

afterAll(() =>  {
//   mockCouchDB.close();
  sqliteNames.forEach(db => fs.unlinkSync(db));
})



it('gets the same document via "ouch.get()" as via "pouch.get()"', () => {
    expect.assertions(1);

    return Promise.all([
        pouch.get("turtle_leonardo"),
        ouch.get("turtle_leonardo"),
    ])
    .then(docs => 
        expect(docs[0]).toEqual(docs[1])
    )
});

it('returns error on malformed doc type', () => {
    expect.assertions(1);

    return pouch.put("turtle_raphael")
    .catch(pouchError => {
        return ouch.put("turtle_raphael")
        .catch(ouchError => 
            expect(pouchError).toEqual(ouchError)
        )
    })
});

it('returns error on malformed doc => missing "_id"', () => {
    expect.assertions(1);

    return pouch.put({ name: "turtle_raphael"})
    .catch(pouchError => {
        return ouch.put({ name: "turtle_raphael"})
        .catch(ouchError => 
            expect(pouchError).toEqual(ouchError)
        )
    })
});

it('gets  all document ids & revs via "ouch.getAll()" as via "pouch.getAll()"', () => {
    expect.assertions(1);

    return Promise.all([
        pouch.allDocs(),
        ouch.allDocs(),
    ])
    .then(docs => {
        expect(docs[0]).toEqual(docs[1])
    })
});
it('gets all full docs via "ouch.getAll()" as via "pouch.getAll()"', () => {
    expect.assertions(1);

    return Promise.all([
        pouch.allDocs({ include_docs: true }),
        ouch.allDocs({ include_docs: true }),
    ])
    .then(docs => {
        expect(docs[0]).toEqual(docs[1])
    })
});

it('gets two full docs & one error doc via ".getAll({ keys: [id1, di2, id3] })"', () => {
    expect.assertions(1);

    const idKeys = ["turtle_donatello", "turtle_michelangelo", "turtle_giovanni" ]
    return Promise.all([
        pouch.allDocs({ keys: idKeys, include_docs: true }),
        ouch.allDocs( { keys: idKeys })
    ])
    .then(docs => {
        // console.log(docs[0].rows.map(x => x))
        // console.log(docs[0].rows) // odd...
        // console.log(docs[0].rows['-1']) // ...very odd!!
        const normalizedPouchRows = docs[0].rows.map(x => x);
        expect(normalizedPouchRows).toEqual(docs[1].rows)
    })
});

it('returns [] as rows value via ".getAll({ keys: [] })"', () => {
    expect.assertions(1);

    return Promise.all([
        pouch.allDocs({ keys: [] }),
        ouch.allDocs( { keys: [] })
    ])
    .then(docs => {
        expect(docs[0]).toEqual(docs[1])
    })
});

it('returns all villain ids & revs via ".getAll({ startkey: "X", endkey: "X" })"', () => {
    expect.assertions(1);

    return Promise.all([
        pouch.allDocs({ startkey: "villain", endkey: "villain\uffff" }),
        ouch.allDocs( { startkey: "villain", endkey: "villain\uffff" })
    ])
    .then(docs => {
        expect(docs[0].rows).toEqual(docs[1].rows)
    })
});

it('returns all villain full docs via ".getAll({ startkey: "X", endkey: "X", include_docs: true })"', () => {
    expect.assertions(1);

    return Promise.all([
        pouch.allDocs({ startkey: "villain", endkey: "villain\uffff", include_docs: true }),
        ouch.allDocs( { startkey: "villain", endkey: "villain\uffff", include_docs: true })
    ])
    .then(docs => {
        expect(docs[0].rows).toEqual(docs[1].rows)
    })
});