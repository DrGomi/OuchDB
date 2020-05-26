// import { ouchDB } from "./main";

// const pouch = new PouchDB('turtles', { adapter: 'websql' });
const db = openDatabase('keule', '1', 'foo', 2 * 1024 * 1024);
const caller = { 
  get: url => new Promise((resolve, reject) =>
    fetch(url)
    .then(res => res.text())
    .then(data => {
      console.log('GOT ',data);
      resolve(data)
    })
    .catch(err => reject(err))
  )
}
const ouch = new OuchDB(db, caller);
ouch.load('resources/turtles.txt')
// ouch.get('leonardo')
// .catch(err =>  {
//   if (err.status !== 404) {
//     throw err;
//   }
//   return pouch.load('resources/turtles.txt')
// })
//     // .then(() => pouch.get("splinter")).catch(info => console.log(info))
// .then(() => 
//   pouch.allDocs({ keys: [
//     "michelangelo",
//     "donatello",
//     "shredder"
//   ], include_docs: true }))
// .catch(err => {
//     console.log(err);
//     expect(true).toBeTruthy();
// })
// .then(docs => {
//     console.log(JSON.stringify(docs));
// })