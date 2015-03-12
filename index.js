var newrelic = require('newrelic');
var http = require("http");
var express = require("express");

var mongoose = require('mongoose');
mongoose.connect('mongodb://master:M4st3rEPICO@ds045011.mongolab.com:45011/heroku_app34109035');
var auto_increment = require('mongoose-auto-increment');

var port = process.env.PORT || 5000;

var app = express();
app.use(express.static(__dirname + "/"));

var server = http.createServer(app);

server.listen(port);
console.log("http server listening on %d", port);

var io = require('socket.io').listen(server);

var connectedUsers = {};
var connectedUsersCount = 0;

var db = mongoose.connection;
auto_increment.initialize(db);	

var messageSchema = mongoose.Schema({
		
	message : String,
	message_id : Number,
	date : Number, 
	name : String,
	flag : String

});

messageSchema.plugin(auto_increment.plugin, 'Message');

var Message = mongoose.model('Message', messageSchema);

db.on('error', console.error.bind(console, 'connection error:'));

io.sockets.on('connection', function (socket){

	console.log('a user connected');	
	
	var addedUser = false;

	socket.on('setNickname', function(data){
		
		console.log(data);
				
		connectedUsers[socket.id] = {user : data, socketID : socket};
		++connectedUsersCount;		
		addedUser = true;						
		
		message_connect_data = {
			
			"message" : "",
			"name" : connectedUsers[socket.id].user,
			"date" : 0,
			"flag" : "user_joined"
			
		};
		
		user_data = {
			"count" : connectedUsersCount			
		}
		
		var message = new Message(message_connect_data);
		message.save(function(err, message){
			
			if(err) return console.error(err);
			user_data.data = message;
			
			io.emit('user_joined', user_data);
			console.log(user_data);
		
		});				
		
	});
	
	socket.on('get_missed_messages', function(last_id){
		
		Message.find({_id: {$gt : (last_id)}, flag: "message"}).sort({$natural: -1}).limit(30).exec(function(err, messages){
			
			var missed_messages = { messages : [] };
		
			if(err) return console.error(err);		
			messages.forEach(function(message){			
				
				missed_messages.messages.push(message);
				
			});	
			
			connectedUsers[socket.id].socketID.emit('missed_messages', missed_messages);
			
		});
		
	});
	
	socket.on('get_old_messages', function(last_id){
		
		Message.find({_id: {$lt : (last_id)}, flag: "message"}).sort({$natural: -1}).limit(30).exec(function(err, messages){
			
			var old_messages = { messages : [] };
		
			if(err) return console.error(err);		
			messages.forEach(function(message){			
				
				old_messages.messages.push(message);
				
			});	
			
			Message.find({_id: {$lt : (last_id - 30)}, flag: "message"}).sort({$natural: -1}).limit(30).count().exec(function(err, count){
			
				if(err) return console.error(err);	
				
				old_messages.count = count;
				
				connectedUsers[socket.id].socketID.emit('old_messages', old_messages);
				
			});											
			
		});	
		
	});
	
	socket.on('get_first_time_messages', function(){
		
		Message.find({flag: "message"}).sort({$natural: -1}).limit(30).exec(function(err, messages){
			
			var firs_time_messages = { messages : [] };
		
			if(err) return console.error(err);		
			messages.forEach(function(message){			
				
				firs_time_messages.messages.push(message);
				
			});	
			
			firs_time_messages.messages.sort(function(a,b){
				return a._id - b._id;
			});
			
			Message.find({_id: {$lt : (last_id - 30)}, flag: "message"}).sort({$natural: -1}).limit(30).count().exec(function(err, count){
			
				if(err) return console.error(err);	
				
				firs_time_messages.count = count;
				
				connectedUsers[socket.id].socketID.emit('firs_time_messages', firs_time_messages);
				
			});						
			
		});	
		
	});
	
	socket.on('message', function(message){
		
		console.log(message);
				
		message_input = message.split("¬SEPARATOR¬")
		
		message_data = {
			
			"message" : message_input[0],
			"message_id" : message_input[1],
			"name" : connectedUsers[socket.id].user,
			"date" : parseInt(message_input[2]),
			"flag" : "message"
			
		};			
		
		Message.findOne({ 'message_id' : message_data.message_id, "name" : message_data.name, "date" : message_data.date }, function(err, message){
			
			if(err)
			{
				console.error(err);				
			}
			else if(message == null)
			{
				
				var message = new Message(message_data);
		
				message.save(function(err, message){
					
					if(err) return console.error(err);
					
					connectedUsers[socket.id].socketID.broadcast.emit('message', message);
					connectedUsers[socket.id].socketID.emit('message_recieved', { message_id : message.message_id, _id : message._id});
					console.log(message);
				
				});
				
			}
			else
			{
				connectedUsers[socket.id].socketID.emit('message_recieved', { message_id : message.message_id, _id: message._id});
			}
			
		});					
	
	});		
	
	socket.on('typing', function(){
		console.log(connectedUsers[socket.id].user+" is Typing")
		connectedUsers[socket.id].socketID.broadcast.emit('typing', connectedUsers[socket.id].user);
	});		
	
	socket.on('stop_typing', function(){		
		console.log(connectedUsers[socket.id].user+" stop Typing")
		connectedUsers[socket.id].socketID.broadcast.emit('stop_typing', connectedUsers[socket.id].user);
	});		

	socket.on('disconnect', function(){
		console.log('user disconnected');
		
		if(addedUser)
		{
			var user_disconnect_data = {};						
			
			message_disconnect_data = {
			
				"message" : "",
				"name" : connectedUsers[socket.id].user,
				"date" : 0,
				"flag" : "user_left"
				
			};							
			
			delete connectedUsers[socket.id];
			--connectedUsersCount
			user_disconnect_data.count = connectedUsersCount;			
	
			var message = new Message(message_disconnect_data);
			message.save(function(err, message){
				
				if(err) return console.error(err);
				
				user_disconnect_data.data = message;
				
				io.emit('user_left', user_disconnect_data);
				console.log(user_disconnect_data);
			
			});
		}
		
	});
});
