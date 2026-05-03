const http = require('http');

let chromeActivityBuffer = [];

function startChromeServer() {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/chrome-activity') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.activities?.length) {
            for (const act of data.activities) {
              if (act.site && act.seconds >= 3) {
                chromeActivityBuffer.push({
                  appName: 'Google Chrome',
                  site: act.site,
                  title: act.title || act.site,
                  seconds: act.seconds
                });
                console.log('Chrome tab tracked:', act.site, act.seconds + 's');
              }
            }
          }
        } catch (e) {}
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(9876, '127.0.0.1', () => {
    console.log('Chrome activity server running on port 9876');
  });

  return server;
}

function getChromeBuffer() {
  const data = [...chromeActivityBuffer];
  chromeActivityBuffer = [];
  return data;
}

module.exports = { startChromeServer, getChromeBuffer };