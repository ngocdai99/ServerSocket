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


const users = {}; // Lưu trữ thông tin người dùng
const typingTimers = {}; // Lưu trữ timer cho sự kiện "đang gõ"

io.on('connection', (socket) => {
  // Xử lý sự kiện người dùng tham gia
  socket.on('join', (userName) => {
    if (Object.values(users).includes(userName)) {
      socket.emit('error', { type: 'username_taken', message: 'User name already taken!' });
      return;
    }

    console.log(`User ${userName} joined chat room`);
    users[socket.id] = userName;

    // Gửi thông báo tới những người dùng khác
    socket.broadcast.emit('user join', { userId: socket.id, userName });
  });

  // Xử lý sự kiện "đang gõ"
  socket.on('typing', ({ to }) => {
    if (typingTimers[socket.id]) {
      clearTimeout(typingTimers[socket.id]); // Xóa timer cũ nếu tồn tại
    }

    const typingData = {
      userId: socket.id,
      userName: users[socket.id],
    };

    // Gửi thông báo "đang gõ" ngay lập tức
    if (to) {
      socket.to(to).emit('user typing', { ...typingData, typing: true });
    } else {
      socket.broadcast.emit('user typing', { ...typingData, typing: true });
    }

    // Đặt timer để gửi thông báo "ngừng gõ" sau 1 giây
    typingTimers[socket.id] = setTimeout(() => {
      if (to) {
        socket.to(to).emit('user typing', { ...typingData, typing: false });
      } else {
        socket.broadcast.emit('user typing', { ...typingData, typing: false });
      }
    }, 1000);
  });

  // Xử lý sự kiện gửi tin nhắn
  socket.on('send message', ({ message, to }) => {
    if (!users[socket.id]) return; // Kiểm tra người dùng có tồn tại không

    console.log(`Message from ${users[socket.id]}: ${message}`);

    const messageData = {
      from: socket.id,
      message,
      userName: users[socket.id],
    };

    if (to) {
      socket.to(to).emit('receive message', messageData); // Gửi tin nhắn riêng
    } else {
      socket.broadcast.emit('receive message', messageData); // Gửi tin nhắn công khai
    }
  });

  // Xử lý sự kiện người dùng ngắt kết nối
  socket.on('disconnect', () => {
    if (!users[socket.id]) return;

    console.log(`User ${users[socket.id]} disconnected`);

    // Gửi thông báo tới những người dùng khác
    socket.broadcast.emit('user left', {
      userId: socket.id,
      userName: users[socket.id],
    });

    // Dọn dẹp dữ liệu
    delete users[socket.id];
    if (typingTimers[socket.id]) {
      clearTimeout(typingTimers[socket.id]);
      delete typingTimers[socket.id];
    }
  });
});
