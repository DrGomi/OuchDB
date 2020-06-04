const fs = require('fs');
const dump = require('./test_utils')['turtleDump'];
const dbSetup = require('./test_utils')['dbSetup'];

const sqliteNames = [ 'turtles_put_1' ];
const [ pouch, ouch ] = dbSetup(sqliteNames[0]);


beforeAll(() =>  {
    return pouch.load(dump);
})

afterAll(() =>  {
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