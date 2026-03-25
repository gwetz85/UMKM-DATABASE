const https = require('https');

https.get('https://umkm-data-default-rtdb.firebaseio.com/.json', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`BODY: ${rawData.substring(0, 100)}`);
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
