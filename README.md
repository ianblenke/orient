# orient

This is a WebRTC based tracking system.

HTML5 device APIs are used for location and orientation data, which is sent over the WebRTC data channel.

Links:

- https://github.com/peers/peerjs
- https://github.com/peers/peerjs-server
- https://github.com/expressjs/express
- https://github.com/jfhbrook/node-ecstatic
- https://github.com/dorukeker/gyronorm.js
- http://leafletjs.com/

# Installation

    npm install

# Running

You may optionally specify a config for Peer.js to use. This would use the public Google STUN server, for example:

    export PEER_CONFIG="{'iceServers': [ { url: 'stun:stun.l.google.com:19302' } ]}"

You may also optionally specify a PORT to listen on. The default is 9999.

    export PORT=9999

The Express.js DEBUG environment variable may also help:

    export DEBUG='express:*'

Start the server:

    node server.js

Now open a browser to your server:

    http://localhost:9999/

If you are running your server on another host, substitude the IP or DNS name of the server for `localhost` above.

