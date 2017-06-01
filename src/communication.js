var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var assert = require('assert');

var exports = module.exports = {}

exports.sendToDevice = function(url, data, socket, io) {  // data contains (1)'deviceId' to send to (2)'token' (3)message
  data = JSON.parse(data);
  MongoClient.connect(url, function(err, db) {
    if(err != null) {
      console.log("Not Connected")
      console.log(err)
      return;
    }
    db.collection('user-devices').findOne({"device": data['deviceId'], "token": data['token']}, function(err, document) {
      assert.equal(err, null);
      assert.notEqual(document, null);
      // send data to a specific device
      if(document["connected"] == true) {
        io.to(document["socket"]).emit("notification", data['message'])
      } else {
        var messages;
        if(document["messages"] == null) {
          messages = [];
        } else {
          messages = document["messages"];
        }
        messages.push(data['message'])
        console.log("messages : ")
        console.log(messages)
        db.collection('user-devices').updateOne({"device": data['deviceId'], "token": data['token']}, {$set:{"messages": messages}}, function(err, document) {
          db.close();
        })
      }
    });
  });
}

exports.sendToRoom = function(url, data, socket, io) { // data contains (1) token (2) room (3) message
  data = JSON.parse(data);
  MongoClient.connect(url, function(err, db) {
    if(err != null) {
      console.log("Not Connected")
      console.log(err)
      return;
    }
    db.collection('rooms').findOne({"token": data['token'], "rooms.name": data['room']}, function(err, document) {
      var roomId;
      for(var i=0; i<document["rooms"].length; i++) {
        if(data["room"] == document["rooms"][i]["name"]) {
          roomId = document["rooms"][i]["roomId"]
          break;
        }
      }
      io.to(roomId).emit("notification", data["message"]) // emit to all devices
      // those device which are connected will recieve with out any problem
      // for those which are not connected we find them and push the message to their buffer
      db.collection('user-devices').update({"token": data["token"], "joinedRooms": new ObjectID(roomId), "connected": false}, {$push: {"messages": data["message"]}}, function(err, count, status){
        db.close();
      })
    })
  })
}