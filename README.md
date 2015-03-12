# socketio-server
Little chat server using NodeJS with Socketio and MongoDB.

## Change Log

### v0.2.3
* Group chat
* Register in database
  * Login
  * Messages
  * Logout
* When user first login, the server send the last 30 messages
* In every login (after the first), the server send the 'Missed Messages'
* When received a new message, the server search in database to check if the message already exists and send a 'Message Received', if the message don't exists in the database, the server saves the message and send to all receptors.