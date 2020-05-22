// import { ouchDB } from "./main";

const pouch = new PouchDB('turtles', { adapter: 'websql' });
// const ouch = new OuchDB('_pouch_turtles');
pouch.get('_local/preloaded')
.catch(err =>  {
  if (err.status !== 404) {
    throw err;
  }
  return pouch.load('resources/turtles.txt')
})
    // .then(() => pouch.get("splinter")).catch(info => console.log(info))
.then(() => 
  pouch.allDocs({ keys: [
    "michelangelo",
    "donatello",
    "shredder"
  ], include_docs: true }))
.catch(err => {
    console.log(err);
    expect(true).toBeTruthy();
})
.then(docs => {
    console.log(JSON.stringify(docs));
})