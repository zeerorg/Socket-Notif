var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require("body-parser");
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var assert = require('assert');

var globalSocket;  // single global socket I will use to emit to all other sockets

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// TODO: mongodb connect
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
    console.log('user disconnected');
  });
  socket.on('DeviceAndToken', function(data){
    connectUserDevice(data, socket)
  });
  socket.on('JoinRoom', function(data){
    joinRoomUserDevice(data, socket)
  });
  socket.on('SendToDevice', function(data) {})
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

function connectUserDevice(data, socket) {
  var device_id = data.split(',')[0]
  var app_token = data.split(',')[1]
  console.log(device_id)
  console.log(app_token)
  MongoClient.connect(url, function(err, db) {
    if(err != null) {
      console.log("Not Connected")
      console.log(err)
      return;
    }
    console.log("Connected correctly to server.");

    if(db.collection('devops').find({"token": app_token}, {limit: 1}).count()){  // check if token is legit
      db.collection('user-devices').findOne({"device": device_id, "token": app_token}, function(err, document) {  //see if user is present
        if(err != null || document == null) {
          console.log("User Not FOund");
          console.log("Insering User ....");
          console.log(app_token)
          console.log(db == null)
          db.collection('rooms').findOne({"token": app_token}, function(err, roomDoc) {  // get rooms for the specific token
            console.log(roomDoc)
            var defaultRoom = roomDoc["rooms"][0]["roomId"]
            db.collection('user-devices').insertOne({
              "device": device_id,
              "token": app_token,
              "joinedRooms": [defaultRoom]
            })
            db.close();
            socket.join(defaultRoom)  // join the single room
          })
        } else {
          // join rooms
          console.log("User found")
          console.log(document)  // ERROR: document comes out to be null but no err
          var rooms = document["joinedRooms"]
          socket.join(rooms)
          db.close();
        }
      });
    } else {
      console.log("Wrong Token");
    }
  });
}

function joinRoomUserDevice(data, socket) {  //'token', 'room' and 'deviceId' are passed in data
  data = JSON.parse(data)
  console.log(data)
  console.log("connecting to room");
  MongoClient.connect(url, function(err, db) {
    console.log("connecting to database")
    if(err != null) {
      console.log("Not Connected")
      console.log(err)
      return;
    }
    console.log("Connected correctly to server.");
    //joinRoomdb(db, data, socket, socketJoinRoomCallback)
    db.collection('rooms').findOne({"token": data['token'], "rooms.name": data['room']}, function(err, document) {  // does the room exist
      if(err != null || document == null) {  // NO room does not exist
        // create Room
        console.log("creating room " + data["room"] + " for token " + data["token"]);
        if(db.collection('devops').find({"token": data['token']}, {limit: 1}).count()){
          db.collection('rooms').findOne({"token": data['token']}, function(err, doc) {
            assert.equal(null, err);
            assert.notEqual(null, doc);
            var rooms = doc['rooms'];
            rooms.push({
              "name": data['room'],
              "roomId": new ObjectID()
            });
            db.collection('rooms').updateOne({"token": data['token']}, {$set:{"rooms": rooms}}, function() {
              socketJoinRoomCallback(db, data, socket, rooms[rooms.length - 1]["roomId"]);
            });
          });
        }
      } else { // YES room exist
        // get the room Id
        console.log(document["rooms"][0]["name"])
        for(var i = 0; i < document["rooms"].length; i++) {
          console.log("comparing " + document["rooms"][i]["name"] + " with " + data["room"])
          if(document["rooms"][i]["name"] == data["room"]) {
            console.log("Going to join Room")
            socketJoinRoomCallback(db, data, socket, document["rooms"][i]["roomId"])
          }
        }
      }
    });
    
  })
}

function joinRoomdb(db, data, socket, socketJoinRoomCallback) { // socketJoinRoomCallback : join the room and add room to user-device
  db.collection('rooms').findOne({"token": data['token'], "rooms.name": data['room']}, function(err, document) {  // does the room exist
    if(err != null || document == null) {  // NO room does not exist
      // create Room
      console.log("creating room " + data["room"] + " for token " + data["token"]);
      if(db.collection('devops').find({"token": data['token']}, {limit: 1}).count()){
        db.collection('rooms').findOne({"token": data['token']}, function(err, doc) {
          assert.equal(null, err);
          assert.notEqual(null, doc);
          var rooms = doc['rooms'];
          rooms.push({
            "name": data['room'],
            "roomId": new ObjectID()
          });
          db.collection('rooms').updateOne({"token": data['token']}, {$set:{"rooms": rooms}}, function() {
            socketJoinRoomCallback(db, data, socket, rooms[rooms.length - 1]["roomId"]);
          });
        });
      }
    } else { // YES room exist
      // get the room Id
      console.log(document["rooms"][0]["name"])
      for(var i = 0; i < document["rooms"].length; i++) {
        console.log("comparing " + document["rooms"][i]["name"] + " with " + data["room"])
        if(document["rooms"][i]["name"] == data["room"]) {
          console.log("Going to join Room")
          socketJoinRoomCallback(db, data, socket, document["rooms"][i]["roomId"])
        }
      }
    }
  });
}

function socketJoinRoomCallback(db, data, socket, roomId) {
  socket.join(roomId)
  console.log("Joined Room")
  db.collection('user-devices').findOne({"device": data['deviceId'], "token": data['token']}, function(err, document) { //add to joined rooms of user
    assert.equal(null, err);
    assert.notEqual(null, document);
    console.log(document)
    var joinedRooms = document["joinedRooms"]
    joinedRooms.push(new ObjectID(roomId))
    db.collection('user-devices').updateOne({"device": data['deviceId'], "token": data['token']}, {$set:{"joinedRooms": joinedRooms}}, function(err, document) {
      db.close();
    })
  })
  /* test notification */
  io.to(roomId).emit('notification', "connected to room " + roomId);
}

// mongo -u admin -p  --authenticationDatabase admin
//./node_modules/.bin/nodemon index.js

// user-devices(collection) -> 

//myCollection.find({text: 'alosh'}, {limit: 1}).count() -->> To check if document exist

// whenever a user registers there will be 1. token generated,, 2. Default room created