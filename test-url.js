const https = require('https');

https.get('https://studio-5698120445-3dc5c-default-rtdb.asia-southeast1.firebasedatabase.app/system_users/agus.json', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`BODY: ${rawData}`);
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
