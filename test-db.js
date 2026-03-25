const https = require('https');
const fs = require('fs');

const urls = [
    'https://studio-5698120445-3dc5c-default-rtdb.firebaseio.com/.json',
    'https://studio-5698120445-3dc5c-default-rtdb.asia-southeast1.firebasedatabase.app/.json',
    'https://studio-5698120445-3dc5c-default-rtdb.europe-west1.firebasedatabase.app/.json'
];

async function test(url) {
    return new Promise((resolve) => {
        const req = https.get(url, (res) => {
            resolve({ url, status: res.statusCode });
        }).on('error', (e) => {
            resolve({ url, error: e.message });
        });
        
        req.setTimeout(3000, () => {
            req.destroy();
            resolve({ url, error: 'Timeout' });
        });
    });
}

async function run() {
    let results = [];
    for (const url of urls) {
        const res = await test(url);
        results.push(res);
    }
    fs.writeFileSync('d:/DKUKM/UMKM-DATABASE/o.json', JSON.stringify(results, null, 2));
}

run();
