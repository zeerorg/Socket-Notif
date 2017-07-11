var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require("body-parser");
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var assert = require('assert');

var rooms = require("./src/rooms.js")
var user = require("./src/basic-user.js")
var communication = require("./src/communication.js")

var globalSocket;  // single global socket I will use to emit to all other sockets

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var url = "mongodb://notifUser:notifsecret@localhost:27017/notif";

app.post('/handle',function(request,response){
  var query1=request.body.var1;
  var query2=request.body.var2;
});

app.get('/', function(req, res){
  var user_id = req.param('id');
  var event = req.param('event');
  var msg = req.param('msg');
  io.emit(event, msg);
  res.send(user_id + ' ' + event + ' ' + msg);
});

io.on('connection', function(socket){
  console.log('a user connected');
  globalSocket = socket;
  socket.on('disconnect', function(){
    user.disconnectUser(url, socket);
  });
  socket.on('DeviceAndToken', function(data){
    user.connectUserDevice(url, data, socket, io);
  });
  socket.on('JoinRoom', function(data){
    rooms.joinRoomUserDevice(url, data, socket, io);
  });
  socket.on('LeaveRoom', function(data){
    rooms.leaveRoomUserDevice(url, data, socket, io);
  })
  socket.on('SendToDevice', function(data) {
    communication.sendToDevice(url, data, socket, io);
  })
  socket.on('SendToRoom', function(data) {
    communication.sendToRoom(url, data, socket, io);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

// mongo -u admin -p  --authenticationDatabase admin
//./node_modules/.bin/nodemon index.js

// user-devices(collection) -> 

//myCollection.find({text: 'alosh'}, {limit: 1}).count() -->> To check if document exist

// whenever a user registers there will be 1. token generated,, 2. Default room created