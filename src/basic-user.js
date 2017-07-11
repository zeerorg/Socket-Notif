var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var assert = require('assert');

var exports = module.exports = {
  connectUserDevice,
  disconnectUser
}

exports.connectUserDevice = function (url, data, socket, io) {
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
    console.log("Connected correctly to database.");

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
              "joinedRooms": [defaultRoom],
              "connected": true,
              "socket": socket.id,
              "messages": []
            })
            db.close();
            socket.join(defaultRoom)  // join the single room
            //io.to(defaultRoom).emit("notification", "Joined room " + defaultRoom);
          })
        } else {
          // join rooms
          console.log("User found")
          var rooms = document["joinedRooms"]
          socket.join(rooms)
          for(var i=0; i < rooms.length; i++) {
            //io.to(rooms[i]).emit("notification", "Joined room " + rooms[i]);
          }
          // send all the pending notifications
          console.log("Sending messages");
          var messages = document["messages"];
          for(var i=0; i<messages.length; i++){
            io.to(socket.id).emit("notification", messages[i])
          }
          // update in database
          var deviceResetSpecs = {
            "connected": true,
            "socket": socket.id,
            "messages": []
          }
          db.collection('user-devices').updateOne({"device": device_id, "token": app_token}, {$set:deviceResetSpecs}, function(err, document) {
            db.close();
          })
        }
      });
    } else {
      console.log("Wrong Token");
    }
  });
}

exports.disconnectUser = function (url, socket) {
  console.log("Disconnecting socket.. " + socket.id);
  MongoClient.connect(url, function(err, db) {
    if(err != null) {
      console.log("Not Connected")
      console.log(err)
      return;
    }
    console.log("Connected correctly to database.");
    // set connected to false and socket to null
    db.collection('user-devices').updateOne({"socket": socket.id}, {$set:{"connected": false, "socket": null}}, function(err, document) {
      db.close();
    });
  });
}