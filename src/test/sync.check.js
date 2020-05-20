const fetch = require("node-fetch");

// const OuchDB = require('../dist/main')['OuchDB'];

const url = "http://127.0.0.1:5500/resources/_all_docs.json";

const log = x => console.log(x);

// fetch(url)
// .then(res => res.json())
// // .then(json => console.log(json))
// // .then(log)
// .catch(log)


const http = require('http');

const router = {
    'splinter': { "name": "Splinter", "weapon": "stick", "bandana": "brown", "_id": "splinter", "_rev": "1-g2b746e11c7f4011483289337ca2dfe3" },
    'raphael': { "name": "Raphael", "weapon": "sausage", "bandana": "red", "_id": "raphael", "_rev": "2-32b746e11c7f4011483289337ca2dfe3" },
    'leonardo': { "name": "Leonardo", "weapon": "katana", "bandana": "blue", "_id": "leonardo", "_rev": "1-c95202ca170be0318d085b33528f7995" },
    'donatello': { "name": "Donatello", "weapon": "pizza-knife", "bandana": "purple", "_id": "donatello", "_rev": "5-b587bb2575475e3e50c7807c404d4d49" },
    'michelangelo': { "name": "Michelangelo", "weapon": "bar", "bandana": "orange", "_id": "michelangelo", "_rev": "3-c4902caddb145cfb9ec444d49a12d7cf" }
}

// Create an instance of the http server to handle HTTP requests
let app = http.createServer((req, res) => {
    // Set a response type of plain text for the response
    const validReq = router[req.url.slice(1)];
    if(!!validReq){
        res.writeHead(200, {'Content-Type': 'json'});
        res.write(JSON.stringify(validReq));
        res.end();
    } else {
        res.writeHead(404, {'Content-Type': 'json'});
        res.end('BAD REQUEST!\n');
    }
});

app.listen(3000, '127.0.0.1');