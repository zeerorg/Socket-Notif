var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require("body-parser");
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

//var db;

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
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
  socket.on('DeviceAndToken', function(data){
    device_id = data.split(',')[0]
    app_token = data.split(',')[1]
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
            db.collection('rooms').findOne({"token": "hellothere"}, function(err, roomDoc) {
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
  })
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

// mongo -u admin -p  --authenticationDatabase admin
//./node_modules/.bin/nodemon index.js

// user-devices(collection) -> 

//myCollection.find({text: 'alosh'}, {limit: 1}).count() -->> To check if document exist

// whenever a user registers there will be 1. token generated,, 2. Default room created