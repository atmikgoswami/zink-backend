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

    const skip = (page - 1) * limit;

    try {
      const messages = await Message.find({
        chatId,
        $or: [{ from: userId }, { to: userId }],
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      return messages;
    } catch (err) {
      logger.error("Error fetching messages:", err);
      throw err;
    }
  };
}

module.exports = MessageDatabase;
