var util = require('util');
var url = require('url');
var mime = require('mime');
var path = require('path');
var fs = require('fs');

var handler = function(request, response) {
  var uriPath = url.parse(request.url).pathname;
  var filename = path.join(__dirname + '/demo/', uriPath);
  console.log(uriPath + ' -> ' + filename);

  path.exists(filename, function(exists) {
    if (!exists) {
      response.writeHead(404, {'Content-Type': 'text/plain'});
      response.write('404 Not Found\n');
      response.end();
      return;
    }

    fs.readFile(filename, 'binary', function(err, file) {
      if (err) {
        response.writeHead(500, {'Content-Type': 'text/plain'});
        response.write(err + '\n');
        response.end();
        return;
      }

      response.writeHead(200, {'Content-Type': mime.lookup(filename)});
      response.write(file, 'binary');
      response.end();
    });
  });
};

var httpd = require('http').createServer(handler);
var io = require('socket.io').listen(httpd);
httpd.listen(80);

var clients = {};

io.sockets.on('connection', function (socket) {

  var hubId;
  socket.on('register', function(theHubId, fn) {
    theHubId = parseInt(theHubId, 10);
    if (theHubId <= 0 || theHubId > 0xffff) {
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
