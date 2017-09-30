// admin page
$(document).on('pageinit', '#admin' ,function(){
  console.log("pageinit admin");
});

$(document).on('pagebeforeshow', '#admin' ,function(){
  console.log("pagebeoreshow admin");
});

$(document).on('pageshow', '#admin' ,function(){
  console.log("pageshow admin");

  var markers = {};
  var map = L.map('map');
  var initialCenter = false;
  var drones = {};
  var admins = {};

  L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Compatibility shim
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

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
      case "Admin":
        console.log("Admin action received from " + conn.peer);
        if(!admins[conn.peer]) {
          admins[conn.peer] = [];
        }
        admins[conn.peer].push(conn);
        break;
      case "Drone":
        console.log("Drone action received from " + conn.peer);
        if(!drones[conn.peer]) {
          drones[conn.peer] = [];
        }
        drones[conn.peer].push(conn);
        break;
      case "orientation":
        /* Do something with the received x,y,z,absolute,alpha,beta,gamma */
        $( "#" + conn.peer + " td.orientationX").html(data.x);
        $( "#" + conn.peer + " td.orientationY").html(data.y);
        $( "#" + conn.peer + " td.orientationZ").html(data.z);
        $( "#" + conn.peer + " td.motionAbsolute").html(data.absolute);
        $( "#" + conn.peer + " td.motionAlpha").html(data.alpha);
        $( "#" + conn.peer + " td.motionBeta").html(data.beta);
        $( "#" + conn.peer + " td.motionGamma").html(data.gamma);
        break;
      case "geolocation":
        console.log("geolocation: " + conn.peer + ": " + JSON.stringify(data));
        /* Do something with the received latitude, longitude */
        var marker = markers[conn.peer];
        if(marker) {
          var newLatLng = new L.LatLng(data.latitude, data.longitude);
          marker.setLatLng(newLatLng); 
        } else {
          marker = L.marker([data.latitude, data.longitude]).addTo(map);
          marker.bindPopup(conn.peer);
          markers[conn.peer] = marker;
        }
        $( "#" + conn.peer + " td.geolocationLatitude").html(data.latitude);
        $( "#" + conn.peer + " td.geolocationLongitude").html(data.longitude);
        break;
      default:
        console.log("Unknown message received from " + conn.peer + ": " + JSON.stringify(data));
    }
  }

  function updateHeader() {
    $( "#my-header" ).html("Orient: Admin: " + peer.id);
    $( "#drones" ).trigger("update");
  }

  peer.on('open', function(id){
    console.log("peer open: my peer id is " + id);
    updateHeader();
    peer.listAllPeers(function(neighbors) {
      $.each( neighbors, function( index, neighbor) {
        if(neighbor != id) {
          console.log("peer open connecting to peer " + neighbor);
          var conn = peer.connect( neighbor, { serialization: "json" });
          conn.on('open', function() {
            console.log("connection outbound open");

            /* Deal with received data from a neighbor that we connected to */
            conn.on('data', function(data) {
              processReceivedData(conn, data);
            });

            /* Tell our new peer that we are an Admin */
            conn.send({
              action: "Admin"
            });

          });
        }
      });
    });
  });

  peer.on('connection', function(conn) {
    console.log("peer connection inbound from " + conn.peer);
    conn.on('open', function() {
      console.log("connection inbound open");

      /* Deal with received data from a neighbor that connected to us */
      conn.on('data', function(data) {
        processReceivedData(conn, data);
      });

      /* Tell our connecting peer that we are an Admin */
      conn.send({
        action: "Admin"
      });
    });
    conn.on('close', function() {
      console.log("connection close");
      $( "#" + conn.peer ).remove();
    });
    conn.on('error', function(err) {
      console.log("connection error: " + err.message);
    });
  });

  // Receiving a call
  peer.on('call', function(call){
    console.log("peer call");
    call.on('stream', function(remoteStream) {
      // Show stream in some video/canvas element.
      console.log("call on answered stream");

      // Add a new collapsible item for this Drone
      var drone = "<div id=\"" + call.peer + "\"><div data-role=collapsible>" + $( "#drone-template" ).html() + "</div></div>";
      $( "#drones" ).append(drone);
      $( "#main" ).trigger("create");

      // Update the collapsible label
      $( "#" + call.peer + " H4 a" ).html("Drone: " + call.peer);
      $( "#drones" ).trigger("update");

      // Attach the remoteStream to our video tag so we can see it
      $('#' + call.peer + " video").prop('src', URL.createObjectURL(remoteStream));
    });

    // Answer the call automatically (instead of prompting user) for demo purposes
    call.answer();

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

  var positionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };

  function positionUpdate(position) {
    var latitude = position.coords.latitude;
    var longitude = position.coords.longitude;
    map.setView([latitude,longitude],13);
    L.marker([latitude, longitude]).addTo(map).bindPopup(peer.id);
  }

  function positionError(err) {
    console.warn('errorPosition: ' + err.code + ': ' + err.message);
    alert("Timeout obtaining your position. Defaulting map view.");
    map.setView([0,0],0);
  }

  if ( navigator.geolocation ) {
    navigator.geolocation.getCurrentPosition(positionUpdate, positionError, positionOptions);
  } else {
    alert("GeoLocation is not available");
  }

  $("#mapid").height($(window).height()).width($(window).width());
  map.invalidateSize();
});

