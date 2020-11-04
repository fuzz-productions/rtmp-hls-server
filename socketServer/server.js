/**
 * NodePop - Simple Node.js server to send and receive messages using Restify and Socket.IO
 *
 * @license Apache-2.0
 * @author Daniel M. Hendricks
 * @see {@link http://github.com/dmhendricks/docker-socketio-relay}
 */

const
    corsMiddleware = require( 'restify-cors-middleware' ),
    colors = require( 'colors/safe' ),
    errors = require( 'restify-errors' ),
    restify = require( 'restify' ),
    socketio = require( 'socket.io' );

const
    server = restify.createServer(),
    io = socketio.listen( server.server ),
    cors = corsMiddleware({ origins: [ "*" ] });

server.use( restify.plugins.queryParser() );
server.use( restify.plugins.bodyParser() );
server.use( cors.preflight );
server.use( cors.actual );


var activeUsers = new Array();
var socketIds = {}

server.get( '/', restify.plugins.serveStatic( { file: 'demo.html',  directory: __dirname  } ) );
server.get( '/favicon.ico', restify.plugins.serveStatic( { directory: __dirname + '/public' } ) );

server.post( '/socket/', function( req, res, next ) {
        console.log( '[msg]', req.body );
        res.send( req.body );
        io.emit("any", req.body);
        next();
});

server.post( '/socket/:socket', function( req, res, next ) {
  console.log( '[msg]', req.params.socket );
  io.emit( req.params.socket, req.body );
  res.send( req.body );
  next();
});


server.get( '/sockets', function( req, res, next ) {
  console.log( '[msg]', req.path() );
  console.log(socketIds);
  res.send( socketIds );
  io.emit("devices", socketIds);
  next();
});

server.get( '/tap', function( req, res, next ) {
  console.log( '[msg]', req.path() );
  console.log(socketIds);

  Object.keys(socketIds).forEach(key => {
    console.log(key);
    io.emit("tap", { device: key, location: "0.33,0.44"});
    Object.assign(socketIds[key], { lastMessage: { device: key, location: "0.33,0.44"}});

  });

  io.emit("devices", socketIds);
  res.send( socketIds );
  next();
});

io.on("connect", function (socket) {
  console.log("Made socket connection");

  io.emit("AssignNumber", activeUsers.length);
  console.log("AssignNumber", activeUsers.length);

  socket.on("newUser", function (data) {
    deviceID = data[0];
    name = data[1];
    console.log("newUser", deviceID, name);
    socket.userId = deviceID;
    activeUsers.push(deviceID);
    socketIds[deviceID] = {state: "idle", name: name };
    io.emit("any", activeUsers);
    io.emit("devices", socketIds);
  });

  socket.on("params", function (data) {
    deviceID = data[0];
    name = data[1];

  })


  socket.on("any", function (data) {
    console.log("any", data);
    io.emit("any", data);
    var deviceID = socket.userId
    Object.assign(socketIds[deviceID], { lastMessage: data});
    console.log(socketIds[deviceID])
  });

  socket.on("tap", function (data) {
    io.emit("tap", data);
    var deviceID = socket.userId
    Object.assign(socketIds[deviceID], { lastMessage: data});
    console.log(socketIds[deviceID])
  });


  socket.on("status", function (data) {
    console.log("status", data);
    var deviceID = socket.userId
    Object.assign(socketIds[deviceID], { state: data});
    console.log(socketIds[deviceID]);
    io.emit("devices", socketIds);
  });

  

  socket.on("disconnect", () => {
    activeUsers = activeUsers.filter(function(value, index, arr){ return value != socket.userId });
    var deviceID = socket.userId
    io.emit("user disconnected", deviceID);
    Object.assign(socketIds[deviceID], { state: "disconnected",});
    console.log(socketIds[deviceID]);
    io.emit("devices", socketIds);
  }); 

  socket.on("chat message", function (data) {
    io.emit("chat message", data);
  });
});

server.listen( 3000, () => console.log( '[init] server initialized' ) );