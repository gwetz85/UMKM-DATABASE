const fs = require('fs');
const https = require('https');

https.get('https://studio-5698120445-3dc5c-default-rtdb.asia-southeast1.firebasedatabase.app/koordinator_kuotas.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('koor.json', data);
    console.log('Done downloading koordinator_kuotas');
  });
});
