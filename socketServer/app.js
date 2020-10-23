var http = require('http');
var socketio = require('socket.io');

var app = http.createServer(function(req, res) {
    var postData = "";
    req.on('data', function(chunk) {
      postData += chunk; //Get the POST data
    });

    req.on('end', function() {
      if (typeof(postData) !== "undefined") {
        var message = JSON.parse(postData);
        console.log(message);
        
        //Do something here
        //Todo...
      }
    });
    res.end();
}).listen(8080);  //Use a non-standard port so it doesn't override your Apache

var io = socketio.listen(app); //Attach socket.io to port 8080

io.sockets.on('connection', function(socket) {
  socket.on('disconnect', function () {
    
  });
});