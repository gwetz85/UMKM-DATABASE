const https = require('https');
const fs = require('fs');

const config = {
  "projectId": "studio-5698120445-3dc5c",
  "apiKey": "AIzaSyB6WCsFNPYLeHAikLwNzrHz5gIWpVJB4-s",
  "databaseURL": "https://studio-5698120445-3dc5c-default-rtdb.asia-southeast1.firebasedatabase.app"
};

async function getRecentData() {
    const url = `${config.databaseURL}/activity_logs.json?orderBy="timestamp"&limitToLast=20`;
    
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: "Failed to parse", raw: data });
                }
            });
        }).on('error', (e) => {
            resolve({ error: e.message });
        });
    });
}

async function run() {
    const logs = await getRecentData();
    fs.writeFileSync('./last-data-check.json', JSON.stringify(logs, null, 2));
    console.log("Done. Results in last-data-check.json");
}

run();
