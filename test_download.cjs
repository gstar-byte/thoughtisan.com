const http = require('http');

http.get('http://localhost:3000/source.tar.gz', (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk.length} bytes`);
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
