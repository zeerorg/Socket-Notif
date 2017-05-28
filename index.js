var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/handle',function(request,response){
  var query1=request.body.var1;
  var query2=request.body.var2;
});

app.get('/', function(req, res){
  var user_id = req.param('id');
  var event = req.param('event');
  var msg = req.param('msg');
  io.emit(event, msg);
  res.send(user_id + ' ' + event + ' ' + msg
  );
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});