const { Server } = require("socket.io");
const chatEvents = require("./events/chat");
const typingEvents = require("./events/typing");
const readEvents = require("./events/read");

global.onlineUsers = {}; // userId → socketId

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (!userId) return;

    global.onlineUsers[userId] = socket.id;

    chatEvents(socket, io);
    typingEvents(socket, io);
    readEvents(socket, io);

    socket.on("disconnect", () => {
      Object.entries(global.onlineUsers).forEach(([key, value]) => {
        if (value === socket.id) delete global.onlineUsers[key];
      });
    });
  });

  return io;
};

module.exports = setupSocket;
