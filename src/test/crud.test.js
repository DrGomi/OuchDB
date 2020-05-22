import { OuchDB } from '../../dist/main';
const mockCouchDB = require('./couchdb_mock');
const openDatabase = require('websql');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-load'));
PouchDB.plugin(require('pouchdb-adapter-node-websql'));

const fs = require('fs');
const fetch = require("node-fetch");

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
  'turtles_crud_2',
  'turtles_crud_3',
  'turtles_crud_4',
  'turtles_crud_5',
  'turtles_crud_6',
  'turtles_crud_7',
//   'turtles_crud_5',
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



it('gets the same document via "ouch.get()" as via "pouch.get()"', () => {
    expect.assertions(1);
    const [ pouch, ouch ] = dbSetup(0);
    return pouch.load(dump)
    // .then(() => pouch.get("splinter")).catch(info => console.log(info))
    .then(() => Promise.all([
        pouch.get("leonardo"),
        ouch.get("leonardo"),
    ]))
    .then(docs => 
        expect(docs[0]).toEqual(docs[1])
    )
});

it('returns error on malformed doc type', () => {
    expect.assertions(1);
    const [ pouch, ouch ] = dbSetup(1);
    return pouch.load(dump)
    .then(() => pouch.put("raphael"))
    .catch(pouchError => {
        return ouch.put("raphael")
        .catch(ouchError => 
            expect(pouchError).toEqual(ouchError)
        )
    })
});

it('returns error on malformed doc => missing "_id"', () => {
    expect.assertions(1);
    const [ pouch, ouch ] = dbSetup(2);
    return pouch.load(dump)
    .then(() => pouch.put({ name: "raphael"}))
    .catch(pouchError => {
        return ouch.put({ name: "raphael"})
        .catch(ouchError => 
            expect(pouchError).toEqual(ouchError)
        )
    })
});

it('gets  all document ids & revs via "ouch.getAll()" as via "pouch.getAll()"', () => {
    expect.assertions(1);
    const [ pouch, ouch ] = dbSetup(3);
    return pouch.load(dump)
    // .then(() => pouch.get("splinter")).catch(info => console.log(info))
    .then(() => Promise.all([
        pouch.allDocs(),
        ouch.allDocs(),
    ]))
    .then(docs => {
        // console.log(docs[0])
        // console.log(docs[1])
        expect(docs[0]).toEqual(docs[1])
    })
});
it('gets all full docs via "ouch.getAll()" as via "pouch.getAll()"', () => {
    expect.assertions(1);
    const [ pouch, ouch ] = dbSetup(4);
    return pouch.load(dump)
    // .then(() => pouch.get("splinter")).catch(info => console.log(info))
    .then(() => Promise.all([
        pouch.allDocs({ include_docs: true }),
        ouch.allDocs({ include_docs: true }),
    ]))
    .then(docs => {
        // console.log(docs[0])
        // console.log(docs[1])
        expect(docs[0]).toEqual(docs[1])
    })
});

it('gets three doc ids & revs via "ouch.getAll({ keys: [id1, di2, id3] })"', () => {
    expect.assertions(1);
    const [ pouch, ouch ] = dbSetup(5);
    return pouch.load(dump)
    // .then(() => pouch.get("splinter")).catch(info => console.log(info))
    .then(() => Promise.all([
        pouch.allDocs({ keys: ["donatello", "michelangelo", "shredder" ], include_docs: true }),
        ouch.allDocs( { keys: ["donatello", "michelangelo", "shredder" ] })
    ]))
    .then(docs => {
        // console.log(docs[0].rows.map(x => x))
        // console.log(docs[0].rows) // odd...
        // console.log(docs[0].rows['-1']) // ...very odd!!
        const normalizedPouchRows = docs[0].rows.map(x => x);
        // console.log(normalizedPouchRows)
        // console.log(docs[1].rows)
        expect(normalizedPouchRows).toEqual(docs[1].rows)
    })
});

it('returns [] as rows value via "ouch.getAll({ keys: [] })"', () => {
    expect.assertions(1);
    const [ pouch, ouch ] = dbSetup(6);
    return pouch.load(dump)
    .then(() => Promise.all([
        pouch.allDocs({ keys: [] }),
        ouch.allDocs( { keys: [] })
    ]))
    .then(docs => {
        expect(docs[0]).toEqual(docs[1])
    })
});

// it('gets three full docs via "ouch.getAll({ keys: [id1, di2, id3] })"', () => {
//     expect.assertions(1);
//     const [ pouch, ouch ] = dbSetup(6);
//     return pouch.load(dump)
//     // .then(() => pouch.get("splinter")).catch(info => console.log(info))
//     .then(() => Promise.all([
//         pouch.allDocs({ keys: ["donatello", "michelangelo", "shredder" ], include_docs: true }),
//         ouch.allDocs( { keys: ["donatello", "michelangelo", "shredder" ], include_docs: true })
//         // pouch.get("shredder"),
//         // ouch.allDocs({ include_docs: true }),
//     ]))
//     .catch(err => {
//         console.log(err);
//         expect(true).toBeTruthy();
//     })
//     .then(docs => {
//         console.log(docs[0])
//         console.log(docs[1])
//         expect(true).toBeTruthy();
//     })
// });

// it('guts a new document via "ouch.put()" as via "pouch.put()"', () => {
//     expect.assertions(1);
//     const [ pouch, ouch ] = dbSetup(0);
//     return pouch.load(dump)
//     .then(() => ouch.put("raphael"))

//     .catch(error => {
//         console.log(error);
//         expect(error).toEqual({
//             status: 400,
//             name: 'bad_request',
//             message: 'Document must be a JSON object',
//             error: true
//           });
//     })
// });
/*
it('guts a new document via "ouch.put()" as via "pouch.put()"', () => {
    expect.assertions(1);
    const [ pouch, ouch ] = dbSetup(4);
    return pouch.load(dump)
    .then(() => ouch.put("raphael"))
    // .then(() => pouch.put({
    //     "name": "Splinter",
    //     "weapon": "stick",
    //     "bandana": "brown",
    //     "_id": "splinter",
    // })).catch(info => console.log(info))
    // .then(() => Promise.all([
    //     pouch.get("leonardo"),
    //     ouch.get("leonardo"),
    // ]))
    .catch(error => {
        // console.log(error);
        expect(error).toEqual({
            status: 400,
            name: 'bad_request',
            message: 'Document must be a JSON object',
            error: true
          });
    })
    // .then(docs => {
    //     console.log(docs);
    //     expect(docs[0]).toEqual(docs[1]);
    // })
});
    */
