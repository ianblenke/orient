var peer = require('peer');
var express = require('express');

var app = express();
var ExpressPeerServer = peer.ExpressPeerServer;

var port = process.env.PORT || 9999;
var options = {
  debug: true,
  allow_discovery: true
}

var server;

// Handle HTTP or HTTPS operation
if(process.env.SSL_KEY_FILE && process.env.SSL_CERT_FILE) {
  const https = require('https');
  const fs = require('fs');

  var privateKey = fs.readFileSync( process.env.SSL_KEY_FILE );
  var certificate = fs.readFileSync( process.env.SSL_CERT_FILE );

  server = https.createServer({
    key: privateKey,
    cert: certificate
  }, app).listen(port, function() {
    console.log(`HTTPS Listening on ${port}`)
  });

  // Also support HTTP alongside HTTPS. Helps with reverse proxy deployments.
  app.listen(port-1, function () {
    console.log(`HTTP Listening on ${port-1}`)
  });
} else {
  server = app.listen(port, function () {
    console.log(`HTTP Listening on ${port}`)
  });
}

// Peer.js WebSocket service
app.use('/peerjs', ExpressPeerServer(server, options));

// Allow 12-factor config to browser from server environment variables
app.get('/config.js', function (req, res) {
  var output = "var config = { port: " + port;
  var peer_config=process.env.PEER_CONFIG || "{}";

  if(process.env.PEER_CONFIG) {
    output = output + `, peer: ${peer_config}`;
  }
  output = output + " };\n";

  res.setHeader('Content-Type', 'application/javascript');
  res.send(output);
});

// Serve static content from public/ folder
app.use(express.static('public'));

