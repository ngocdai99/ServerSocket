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


app.use(express.static(path.join(__dirname, 'public')));


const users = {};
const typingTimers = {};

io.on('connection', (socket) => {

  socket.on('join', (userName) => {
    if (Object.values(users).includes(userName)) {
      socket.emit('error', { type: 'username_taken', message: 'User name already taken!' });
      return;
    }

    console.log(`User ${userName} joined chat room`);
    users[socket.id] = userName;

  });


  socket.on('typing', () => {
    if (typingTimers[socket.id]) {
      clearTimeout(typingTimers[socket.id]);
    }

    const typingData = {
      userId: socket.id,
      userName: users[socket.id],
    };
    socket.broadcast.emit('user typing', { ...typingData, typing: true });

    typingTimers[socket.id] = setTimeout(() => {
      socket.broadcast.emit('user typing', { ...typingData, typing: false });

    }, 1000);
  });


  socket.on('send message', ({ message }) => {
    if (!users[socket.id]) return; // Kiểm tra người dùng có tồn tại không

    console.log(`Message from ${users[socket.id]}: ${message}`);

    const messageData = {
      from: socket.id,
      message,
      userName: users[socket.id],
    };
    socket.broadcast.emit('receive message', messageData); 
  });

  // Xử lý sự kiện người dùng ngắt kết nối
  socket.on('disconnect', () => {
    if (!users[socket.id]) return;

    console.log(`User ${users[socket.id]} disconnected`);

    // Dọn dẹp dữ liệu
    delete users[socket.id];
    if (typingTimers[socket.id]) {
      clearTimeout(typingTimers[socket.id]);
      delete typingTimers[socket.id];
    }
  });
});
