var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var assert = require('assert');

var exports = module.exports = {}

exports.connectUserDevice = function(url, data, socket, io) {
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
        if(err != null || document == null) {  // user is not present
          console.log("User Not Found");
          console.log("Insering User ....");
          console.log("App token passed : "+app_token);
          db.collection('rooms').findOne({"token": app_token}, function(err, roomDoc) {  // get rooms for the specific token
            console.log("Token and associated rooms : "+roomDoc)
            var defaultRoom = roomDoc["rooms"][0]["roomId"]
            db.collection('user-devices').insertOne({
              "device": device_id,
              "token": app_token,
              "joinedRooms": [defaultRoom]
            })
            db.close();
            socket.join(defaultRoom)  // join the single room
            io.to(defaultRoom).emit("notification", "Joined room " + defaultRoom);
          })
        } else {
          // join rooms
          console.log("User found")
          console.log("User : \t")
          console.log(document)  //(Resolved) ERROR: document comes out to be null but no err
          var rooms = document["joinedRooms"]
          socket.join(rooms)
          for(var i=0; i < rooms.length; i++) {
            io.to(rooms[i]).emit("notification", "Joined room " + rooms[i]);
          }
          db.close();
        }
      });
    } else {
      console.log("Wrong Token");
    }
  });
}