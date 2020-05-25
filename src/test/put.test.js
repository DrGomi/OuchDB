import { OuchDB } from '../../dist/main';
// const mockCouchDB = require('./couchdb_mock');
const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));

const fs = require('fs');
const fetch = require("node-fetch");

// mockCouchDB.listen(3000, '127.0.0.3');

const dump = `{"version":"1.2.6","db_type":"http","start_time":"2016-04-26T03:46:38.779Z","db_info":{"doc_count":4,"update_seq":4,"sqlite_plugin":false,"websql_encoding":"UTF-8","db_name":"turtles","auto_compaction":false,"adapter":"http","instance_start_time":"1461637740203","host":"http://localhost:6984/turtles/"}}
{"docs":[{"name":"Donatello","weapon":"bo","bandana":"purple","_id":"donatello","_rev":"2-c2f9e6a91b946fb378d53c6a4dd6eaa2"},{"name":"Leonardo","weapon":"katana","bandana":"blue","_id":"leonardo","_rev":"1-c95202ca170be0318d085b33528f7995"},{"name":"Michelangelo","weapon":"nunchaku","bandana":"orange","_id":"michelangelo","_rev":"1-52ebc5a2f8dbc0dc247cd87213e742d1"},{"name":"Raphael","weapon":"sai","bandana":"red","_id":"raphael","_rev":"1-77812e9da146bc18a37e51efb063dbac"}]}
{"seq":4}`;

const sqliteNames = [ 
    'turtles_put_1',
    // 'turtles_put_2'
];

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
    return pouch.load(dump);
})

afterAll(() =>  {
//   mockCouchDB.close();
  sqliteNames.forEach(db => fs.unlinkSync(db));
})


it('returns error on malformed doc type', () => {
    expect.assertions(1);

    return pouch.put("turtle_raphael")
    .catch(pouchError => {
        return ouch.put("turtle_raphael")
        .catch(ouchError => {
            expect(pouchError).toEqual(ouchError)
        })
    })
});

it('returns error on malformed doc => missing "_id"', () => {
    expect.assertions(1);

    return pouch.put({ name: "turtle_raphael"})
    .catch(pouchError => {
        return ouch.put({ name: "turtle_raphael"})
        .catch(ouchError => {
            expect(pouchError).toEqual(ouchError)
        })
    })
});

it('returns error if new put doc contains "_rev" keys', () => {
    expect.assertions(1);

    const putDoc = {
        "name":"Donatello",
        "weapon":"bo",
        "bandana":"purple",
        "_id":"new_unique_id",
        "_rev":"2-c2f9e6a91b946fb378d53c6a4dd6eaa2"
    };
    return pouch.put(putDoc)
    .catch(pouchError => {
        return ouch.put(putDoc)
        .catch(ouchError => {
            expect(pouchError).toEqual(ouchError)
        })
    })
});

it('returns error if put doc has lower "_rev" key', () => {
    expect.assertions(1);

    const putDoc = {
        "name":"Donatello",
        "weapon":"bo",
        "bandana":"purple",
        "_id":"donatello",
        "_rev":"1-lower-than-current-db-rev"
    };
    return pouch.put(putDoc)
    .catch(pouchError => {
        return ouch.put(putDoc)
        .catch(ouchError => {
            expect(pouchError).toEqual(ouchError)
        })
    })
});

it('returns error if update doc has no "_rev" key', () => {
    expect.assertions(1);

    const putDoc = {
        "name":"Donatello",
        "weapon":"bo",
        "bandana":"purple",
        "_id":"donatello",
    };
    return pouch.put(putDoc)
    .catch(pouchError => {
        return ouch.put(putDoc)
        .catch(ouchError => {
            expect(pouchError).toEqual(ouchError)
        })
    })
});

it('successfully puts valid new doc into db', () => {
    expect.assertions(1);

    const putDoc = {
        "name":"Keule",
        "weapon":"swing",
        "bandana":"white",
        "_id":"keule",
    };

    return ouch.put(putDoc)
    .then(() => ouch.get('keule'))
    .then(doc => {
        // console.log(doc);
        const { _rev, ...getDoc } = doc;
        expect(putDoc).toEqual(getDoc);
    })
});