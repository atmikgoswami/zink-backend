const {
  chatDatabase: chatDb,
  messageDatabase: messageDb,
} = require("../../database");

module.exports = (socket, io) => {
  module.exports = (socket, io) => {
    socket.on("typing:start", async ({ from, chatId }) => {
      const chat = await chatDb.getChatById(chatId);
      chat.members.forEach((memberId) => {
        if (memberId.toString() !== from) {
          const targetSocket = global.onlineUsers[memberId.toString()];
          if (targetSocket) {
            io.to(targetSocket).emit("typing:start", { from, chatId });
          }
        }
      });
    });

    socket.on("typing:stop", async ({ from, chatId }) => {
      const chat = await chatDb.getChatById(chatId);
      chat.members.forEach((memberId) => {
        if (memberId.toString() !== from) {
          const targetSocket = global.onlineUsers[memberId.toString()];
          if (targetSocket) {
            io.to(targetSocket).emit("typing:stop", { from, chatId });
          }
        }
      });
    });
  };
};
