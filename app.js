// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

const users = {}
// Manage connected users
io.on('connection', (socket) => {


  socket.on('join', (username) => {
    console.log(`User ${username} joined chat room`)
    socket.broadcast.emit('user join', { userId: socket.id, username })
    users[socket.id] = username
  })

  socket.on('typing', ({ to }) => {
    if (to) {
      socket.to(to).emit('user typing', { userId: socket.id, userName: users[socket.id] })
      console.log(`User ${users[socket.id]} is typing`)
    } else {
      socket.broadcast.emit('user typing', { userId: socket.id, userName: users[socket.id] })
      console.log(`User ${users[socket.id]} is typing`)
    }
  })

  socket.on('send message', ({ message, to }) => {
    console.log(`Message from ${users[socket.id]}: ${message}`);
    if (to) {
      socket.to(to).emit('receive message', {
        from: socket.id,
        message,
        userName: users[socket.id]
      })
    } else {
      socket.broadcast.emit('receive message', {
        from: socket.id,
        message,
        userName: users[socket.id]
      })
    }
  })
  socket.on('disconnect', () => {
    socket.broadcast.emit('user left', { userId: socket.id, userName: users[socket.id] })
    console.log(`disconnect`)
    delete users[socket.id]
  })
})