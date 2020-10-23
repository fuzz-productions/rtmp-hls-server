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


const activeUsers = new Set();

// Static routing
// server.get( '/', ( req, res, next ) => { next
//       console.log(__dirname);
//       res.send( restify.plugins.serveStatic( { directory: __dirname + '/demo.html' } ) )
//       next()
// });

server.get( '/', restify.plugins.serveStatic( { file: 'demo.html',  directory: __dirname  } ) );
server.get( '/favicon.ico', restify.plugins.serveStatic( { directory: __dirname + '/public' } ) );

// Relay messages to connected clients
server.post( '/socket/', function( req, res, next ) {
        console.log( '[msg]', req.body );
        //io.emit( req.params.socket, req.body );
        res.send( req.body );
        io.emit("any", req.body);
        next();
});

io.on("connect", function (socket) {
  console.log("Made socket connection");
  let counter = 0;
  setInterval(() => {
    ++counter
    console.log("sending", counter);
    socket.emit('hello', counter);

  }, 1000);
  
  io.emit("AssignNumber", activeUsers.count);
  console.log("AssignNumber", activeUsers.count);

  socket.on("new user", function (data) {
    console.log(data);
    socket.userId = data;
    activeUsers.add(data);
    io.emit("new user", [...activeUsers]);
    socket.broadcast.emit("typing", data);
  });

  socket.on("disconnect", () => {
    activeUsers.delete(socket.userId);
    io.emit("user disconnected", socket.userId);
  });

  socket.on("chat message", function (data) {
    io.emit("chat message", data);
  });
  
  socket.on("typing", function (data) {
    socket.broadcast.emit("typing", data);
  });
});

server.listen( 3000, () => console.log( '[init] server initialized' ) );