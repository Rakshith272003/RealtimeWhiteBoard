
const express = require('express');//web app framework for Node.js handles HTTP request and Response
const http = require('http');
const socketIo = require('socket.io');//enables real-time, bidirectional, and event-based communication between web clients and servers.

const app = express();//instance of app
const server = http.createServer(app);//create http server
const io = socketIo(server);

const PORT = process.env.PORT || 3007;

app.use(express.static('public'));//serve static files from the "public" directory

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('drawing', (data) => {
    socket.broadcast.emit('drawing', data);//others
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
/*
Import Required models
Create Express App and HTTP Server
Set the Port
Serve Static Files
Handle Socket.IO Connections
Handle Drawing Events
Handle Client Disconnection
Start the Server
*/