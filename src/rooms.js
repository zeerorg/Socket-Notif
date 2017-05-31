var MongoClient = require('mongodb').MongoClient
var ObjectID = require('mongodb').ObjectID;
var assert = require('assert');

var exports = module.exports = {}

exports.joinRoomUserDevice = function(url, data, socket, io) {  //'token', 'room' and 'deviceId' are passed in data
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
              socketJoinRoomCallback(db, data, socket, io, rooms[rooms.length - 1]["roomId"]);
            });
          });
        }
      } else { // YES room exist
        // get the room Id
        for(var i = 0; i < document["rooms"].length; i++) {
          console.log("searching room");
          if(document["rooms"][i]["name"] == data["room"]) {
            console.log("Going to join Room")
            socketJoinRoomCallback(db, data, socket, io, document["rooms"][i]["roomId"])
          }
        }
      }
    });
    
  })
}

function socketJoinRoomCallback(db, data, socket, io, roomId) {
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