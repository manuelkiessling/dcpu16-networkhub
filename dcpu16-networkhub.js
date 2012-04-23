var util = require('util');
var httpd = require('http').createServer(handler);
var io = require('socket.io').listen(httpd);

httpd.listen(8080);

function handler(req, res) {
  //
}

var clients = {};

io.sockets.on('connection', function (socket) {

  var hubId;
  socket.on('register', function(theHubId, fn) {
    theHubId = parseInt(theHubId, 10);
    if (theHubId <= 0 || theHubId > 0xfff) {
      console.log('invalid hub id ' + theHubId);
      return;
    }
    hubId = theHubId;
    if (clients[hubId] !== undefined) {
      console.log('hub id ' + hubId + ' is already in use');
      fn(false);
      return;
    }
    clients[hubId] = socket;
    fn(true);
    console.log('Registered new client with hub id #' + hubId);
  });

  socket.on('toHub', function(packet) {
    if (hubId === undefined) {
      console.log('connection is not yet registered with a hub id');
      return;
    }
    if (   packet === undefined || packet.receiverHubId === undefined || packet.data === undefined
        || parseInt(packet.receiverHubId) > 0xffff || parseInt(packet.receiverHubId) <= 0
        || parseInt(packet.data > 0xffff) || parseInt(packet.data < 0)
        || clients[parseInt(packet.receiverHubId)] === undefined) {
      console.log('invalid packet ' + util.inspect(packet));
      return;
    }
    console.log('Hub client #' + hubId + ' sends to #' + packet.receiverHubId.toString(10) + ': ' + packet.data.toString(10) + ' (0x' + packet.data.toString(16) + ')');
    clients[parseInt(packet.receiverHubId)].emit('fromHub', {
      senderHubId: hubId,
      data: parseInt(packet.data)
    });
  });

  socket.on('disconnect', function() {
    clients[hubId] = undefined;
    console.log('Client #' + hubId + ' disconnected');
  });
});
