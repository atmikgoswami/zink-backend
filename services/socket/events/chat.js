const {
  chatDatabase: chatDb,
  messageDatabase: messageDb,
} = require("../../database");

const transformMessage = (msg) => ({
  id: msg._id?.toString(),                     // ✅ required
  from: msg.from?.toString(),
  to: msg.to?.toString() ?? null,
  chatId: msg.chatId?.toString(),
  content: msg.content,
  messageType: msg.messageType,
  mediaUrl: msg.mediaUrl ?? null,
  caption: msg.caption ?? null,
  edited: msg.edited ?? false,
  readAt: msg.readAt ?? null,
  readBy: msg.readBy ?? [],
  timestamp: new Date(msg.timestamp).getTime(), // ✅ convert to number
});


module.exports = (socket, io) => {
  socket.on("message:send", async (data) => {
    const { from, to, chatId, content, messageType, mediaUrl, caption } = data;

    try {
      let chat;

      if (chatId) {
        chat = await chatDb.getChatById(chatId);
      } else {
        chat = await chatDb.getOrCreateChat(from, to); // For private chat
      }

      const message = await messageDb.createMessage({
        from,
        to: chat.chatType === "private" ? to : null,
        chatId: chat._id,
        content,
        messageType,
        mediaUrl,
        caption,
      });

      await chatDb.updateChatOnMessage(chat._id, message._id);

      // Broadcast to group members
      chat.members.forEach((memberId) => {
        const recipientSocket = global.onlineUsers[memberId.toString()];
        if (recipientSocket && memberId.toString() !== from) {
          io.to(recipientSocket).emit("message:receive", {
            chatId: chat._id,
            message: transformMessage(message),
          });
        }
      });

      // Acknowledge sender
      socket.emit("message:sent", {
        chatId: chat._id,
        message: transformMessage(message),
      });
    } catch (err) {
      console.error("Error in message:send:", err);
      socket.emit("error", { message: "Message send failed" });
    }
  });
};
