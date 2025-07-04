const {
  chatDatabase: chatDb,
  messageDatabase: messageDb,
} = require("../../database");

module.exports = (socket, io) => {
  socket.on("message:read", async ({ messageId, chatId, readerId }) => {
    try {
      const readAt = new Date();

      // Mark the message as read (handles both private & group)
      const message = await messageDb.markMessageAsRead(messageId, readerId);

      const chat = await chatDb.getChatById(chatId);
      if (!chat) throw new Error("Chat not found");

      // Notify other members (except the one who read)
      chat.members.forEach((memberId) => {
        const socketId = global.onlineUsers[memberId.toString()];
        if (socketId && memberId.toString() !== readerId) {
          io.to(socketId).emit("message:read", {
            messageId,
            readerId,
            readAt,
            chatId,
          });
        }
      });
    } catch (err) {
      console.error("Error in message:read:", err);
      socket.emit("error", { message: "Failed to mark message as read" });
    }
  });
};
