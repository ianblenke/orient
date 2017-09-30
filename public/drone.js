// drone page
$(document).on('pagebeforeshow', '#drone' ,function(){
  console.log("pagebeoreshow drone");
});

$(document).on('pageinit', '#drone' ,function(){
  console.log("pageinit drone");
});

$(document).on('pageshow', '#drone' ,function(){
  console.log("pageshow drone");

  var x;
  var y;
  var z;
  var absolute;
  var alpha;
  var beta;
  var gamma;
  var latitude;
  var longitude;
  var drones = {};
  var admins = {};

  // Compatibility shim
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  // Use a 60fps rear "environment" facing camera
  var media_constraints = {
    audio: true,
    video: {
      width: { min: 640, max: 1920 },
      height: { min: 480, max: 1080 },
      frameRate: { ideal: 60 },
      facingMode: { ideal: "environment" }
    }
  };

  var inputVideo = $( "#my-video" )[0];
  var inputCtx = $( "#my-canvas" )[0].getContext( '2d' );

  // Send the video to a canvas
  function drawToCanvas() {
    // draw the current frame of localVideo onto the canvas,
    // starting at 0, 0 (top-left corner) and covering its full
    // width and heigth
    inputCtx.drawImage( inputVideo, 0, 0, inputVideo.videoWidth, inputVideo.videoHeight );

    //repeat this every time a new frame becomes available using
    //the browser's build-in requestAnimationFrame method
    window.requestAnimationFrame( drawToCanvas );
  }

  // Prepare the audio/video stream
  navigator.getUserMedia(media_constraints, function(stream){
    // View our self-view
    $('#my-video').prop('src', URL.createObjectURL(stream));
/*
    inputVideo.addEventListener("canplay", function(ev) {
      console.log("canplay: " + inputVideo.videoWidth + " " + inputVideo.videoHeight);
      $("#my-canvas").width(inputVideo.videoWidth);
      $("#my-canvas").height(inputVideo.videoHeight);
      $("#drone" ).trigger("update");
      drawToCanvas();
    });
    // Remember our self-view stream from canvas rendered from video
    window.localStream = $("#my-canvas")[0].captureStream();
*/
    // Remember our self-view stream directly from video
    window.localStream = stream;
  }, function(e){ console.log("Error in getUserMedia(): " + e.message); });

  // PeerJS object
  var peer = new Peer({
    host: window.location.hostname,
    port: config.port,
    path: '/peerjs',
    debug: 3,
    config: config.peer
  });

  function processReceivedData(conn, data) {
    switch (data.action) {
      case "Drone":
        // We now have a data connection open to a neighboring Drone
	  // Remember all drone connections for this peer
        if(!drones[conn.peer]) {
          drones = [ conn ];
        }
        drones[conn.peer].push(conn);
        break;
      case "Admin":
        console.log("Admin received from " + conn.peer);

	  // Remember this latest Admin connection for this peer
        admins[conn.peer] = [ conn ];

        // Initiate a call to this new Admin
        var call = peer.call(conn.peer, window.localStream);
        // Wait for stream on the call, then set peer video display
        /*call.on('stream', function(stream){
          $('#their-video').prop('src', URL.createObjectURL(stream));
        });*/
        break;
      default:
        console.log("Unknown message " + data.action + " received from " + conn.peer + ": " + JSON.stringify(data));
    }

  }

  function updateHeader() {
    $( "#my-header" ).html("Orient: Drone: " + peer.id);
    $( "#my-header" ).trigger("create");
  }

  peer.on('open', function(id){
    console.log("peer open: my peer id is " + id);
    updateHeader();
    peer.listAllPeers(function(neighbors) {
      $.each( neighbors, function(index, neighbor) {
        if(neighbor != id) {
          console.log("peer open connecting to peer " + neighbor);
          var conn = peer.connect( neighbor, { serialization: "json" });
	    conn.on('open', function(id) {
            console.log("connection open outbound");
 
            /* Deal with received data from a neighbor */
            conn.on('data', function(data) {
              processReceivedData(conn, data);
            });

            /* As we start up, tell our neighbors we are a Drone */
            conn.send({
              action: "Drone"
            });
          });
        }
      });
    });
  });

  peer.on('connection', function(conn) {
    console.log("peer connection inbound from " + conn.peer);
    conn.on('open', function(id) {
      console.log("connection open inbound");
 
      /* Deal with received data from a neighbor */
      conn.on('data', function(data) {
        processReceivedData(conn, data);
      });

      /* As we start up, tell our neighbors we are a Drone */
      conn.send({
        action: "Drone"
      });
    });
    conn.on('close', function() {
      console.log("connection close");
    });
    conn.on('error', function(err) {
      console.log("connection error: " + err.message);
    });
  });

  // Receiving a call
  peer.on('call', function(call){
    console.log("peer call");
    // Answer the call automatically (instead of prompting user) for demo purposes
    call.answer(window.localStream);
    call.on('stream', function(remoteStream) {
      // Show stream in some video/canvas element.
      console.log("call on answered stream");
    });
  });

  peer.on('close', function(){
    console.log("peer close");
  });

  peer.on('disconnected', function(){
    console.log("peer disconnected");
    setTimeout(function () {
      console.log("peer attempting to reconnect after waiting 3 seconds");
      peer.reconnect();
    }, 3000);
  });

  peer.on('error', function(err){
    console.log("peer error: " + err.type + ": " + err.message);
    switch (err.type) {
      case "network":
      case "disconnected":
      case "server-error":
      case "socket-error":
      case "socket-closed":
	  peer.disconnect();
	  break;
	default:
        alert(err.message);
    }
  });

  var gnargs = {
    frequency:50,                  // ( How often the object sends the values - milliseconds )
    gravityNormalized:true,        // ( If the gravity related values to be normalized )
    orientationBase:GyroNorm.GAME, // ( Can be GyroNorm.GAME or GyroNorm.WORLD.
                                   //   gn.GAME returns orientation values with respect to the head direction of the device.
                                   //   gn.WORLD returns the orientation values with respect to the actual north direction of the world. )
    decimalCount:2,                // ( How many digits after the decimal point will there be in the return values )
    logger:null,                   // ( Function to be called to log messages from gyronorm.js )
    screenAdjusted:false           // ( If set to true it will return screen adjusted values. )
  };

  var gn = new GyroNorm();
  gn.init(gnargs).then(function(){
    gn.start(function(data){
      x = data.dm.x;
      y = data.dm.y;
      z = data.dm.z;
      absolute = data.do.absolute;
      alpha = data.do.alpha;
      beta = data.do.beta;
      gamma = data.do.gamma;

      // Send our DeviceOrientation and DeviceMotion directly to our Admins
      $.each( admins, function( index, conns) {
        $.each( conns, function( index, conn) {
          if(conn.open) {
            conn.send({
              action: "orientation",
              x: x,
              y: y,
              z: z,
              absolute: absolute,
              alpha: alpha,
              beta: beta,
              gamma: gamma
            });
          }
        });
      });
    });
  }).catch(function(e){
    // Catch if the DeviceOrientation or DeviceMotion is not supported by the browser or device
    alert("DeviceOrientation and/or DeviceMotion are not available");
  });

  function positionUpdate(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;

    // Send our GeoLocation directly to the Admins
    $.each( admins, function( index, conns) {
      $.each( conns, function( index, conn) {
        if(conn.open) {
          conn.send({
            action: "geolocation",
            latitude: longitude,
            longitude: latitude
          });
        }
      });
    });
  }

  var positionOptions = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };

  function positionError(err) {
    console.warn('errorPosition: ' + err.code + ': ' + err.message);
    navigator.geolocation.watchPosition(positionUpdate, positionError, positionOptions);
  }

  if ( navigator.geolocation ) {
    navigator.geolocation.watchPosition(positionUpdate, positionError, positionOptions);
  } else {
    alert("GeoLocation is not available");
  }

  $( window ).on( "orientationchange", function( event ) {
    $( "#orientation" ).text( "This device is in " + event.orientation + " mode!" );
  });

  // Trigger an orientationchange event
  $( window ).orientationchange();
});

