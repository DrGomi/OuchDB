// import { ouchDB } from "./main";

const pouch = new PouchDB('turtles', { adapter: 'websql' });
const ouch = new OuchDB('_pouch_turtles');
pouch.get('_local/preloaded')
.catch(err =>  {
  if (err.status !== 404) {
    throw err;
  }
  return pouch.load('resources/turtles.txt')
})
// .then(() => new Promise(resolve => {
//     openDatabase('_pouch_turtles', '1', 'foo', 2 * 1024 * 1024)
//         .transaction(tx => resolve(tx))
// }))
.then(() => pouch.get('donatello').then(itm => pouch.put({...itm, ...{ weapon: 'booo' }})))
.then(() => ouch.getAllRows("by-sequence"))
.then(txNres => new Promise((resolve, reject) => {
    const [tx, res] = txNres;
    const origSeq = ouch.mapDocRows(res);
    const filterSeq = ouch.filterOldRevs(origSeq);
    ouch.killOldRevs(origSeq, filterSeq); // side effect! 
    ouch.dropFunnyTables(tx)
    resolve([origSeq, filterSeq]);
}))
.then(res => {
    console.log(res);
})
.catch(console.log.bind(console));