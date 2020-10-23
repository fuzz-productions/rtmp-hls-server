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

let debug = process.env.DEBUG || false,
    api_key = process.env.API_KEY;

// Start-up
// console.log( colors.bold( '%s v%s by %s / %s' ), pkg.config.app_name, pkg.version, pkg.author.name, pkg.author.url );
// console.log( 'License: %s / %s', pkg.license, pkg.config.links.license );
// console.log( 'GitHub: ' + pkg.homepage );
// console.log( 'Docker: ' + pkg.config.links.docker );

if( typeof api_key === 'undefined' || !api_key.length ) console.warn( colors.brightYellow( '[warn] API_KEY is not defined.' ) );

// Static routing
server.get( '/', ( req, res, next ) => next( new errors.ResourceNotFoundError( 'File Not Found' ) ) );
server.get( '/favicon.ico', restify.plugins.serveStatic( { directory: __dirname + '/public' } ) );

// Relay messages to connected clients
server.post( '/socket/:socket', function( req, res, next ) {

    if( typeof api_key === 'undefined' || !api_key.length || ( typeof req.query.api_key === 'undefined' || api_key !== req.query.api_key ) ) {
        if( debug ) console.log( colors.red( '[error] Invalid API key from', req.connection.remoteAddress ) );
        next( new errors.InvalidCredentialsError( 'Unauthorized' ) );
    } else {
        if( debug ) console.log( '[msg]', req.body );
        io.emit( req.params.socket, req.body );
        res.send( req.body );
        next();
    }
});

// io.sockets.on('connection', function(socket) {
//     console.log("welcome");
//     //io.emit( socket, "Welcome" );

//     socket.on('disconnect', function () {
//       console.log("disconnect");
      
//     });
//   });


const activeUsers = new Set();

io.on("connection", function (socket) {
  console.log("Made socket connection");

  socket.on("new user", function (data) {
    socket.userId = data;
    activeUsers.add(data);
    io.emit("new user", [...activeUsers]);
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