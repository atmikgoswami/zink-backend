function MessageDatabase() {
  const logger = require("../log");
  const Message = require("../../models/message");

  this.createMessage = async (data) => {
    if (!data) {
      throw "Message must contain from, to, and other valid data";
    }

    try {
      const newMessage = await Message.create(data);
      return newMessage.toObject();
    } catch (err) {
      logger.error("Error creating message: " + err);
      throw err;
    }
  };

  this.markMessageAsRead = async (messageId, userId) => {
    if (!messageId || !userId) throw "messageId and userId are required";

    const message = await Message.findById(messageId);
    if (!message) throw "Message not found";

    const now = new Date();

    if (message.to) {
      // Private message
      message.readAt = now;
    } else {
      // Group message → track per user
      const alreadyRead = message.readBy.find(
        (r) => r.user.toString() === userId.toString()
      );
      if (!alreadyRead) {
        message.readBy.push({ user: userId, at: now });
      }
    }

    await message.save();
    return message;
  };

  this.getMessagesByChatId = async (chatId, userId, page = 1, limit = 20) => {
    if (!chatId || !userId) throw "chatId and userId are required";

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    try {
      const messages = await Message.find({
        chatId,
        $or: [{ from: userId }, { to: userId }],
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(); // important: returns plain JS objects, not Mongoose docs

      const converted = messages.map((msg) => ({
        id: msg._id.toString(), // ✅ Rename _id to id
        from: msg.from,
        to: msg.to,
        chatId: msg.chatId,
        messageType: msg.messageType,
        content: msg.content,
        mediaUrl: msg.mediaUrl,
        caption: msg.caption,
        edited: msg.edited,
        readAt: msg.readAt ? Number(msg.readAt) : undefined,
        readBy: Array.isArray(msg.readBy)
          ? msg.readBy.map((rb) => ({
              user: rb.user,
              at: rb.at ? Number(rb.at) : undefined,
            }))
          : [],
        timestamp: Number(msg.timestamp), // ✅ ensure timestamp is number
      }));

      return converted;
    } catch (err) {
      logger.error("Error fetching messages:", err);
      throw err;
    }
  };
}

module.exports = MessageDatabase;
