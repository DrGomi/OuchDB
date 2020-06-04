const fs = require('fs');
const dump = require('./test_utils')['turtleNVillainDump'];
const dbSetup = require('./test_utils')['dbSetup'];

const sqliteNames = [ 'turtles_get_1' ];
const [ pouch, ouch ] = dbSetup(sqliteNames[0]);


beforeAll(() =>  {
    return pouch.load(dump);
})

afterAll(() =>  {
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