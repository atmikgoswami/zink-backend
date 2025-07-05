function ChatDatabase() {
  const logger = require("../log");
  const Chat = require("../../models/chat");

  this.getOrCreateChat = async (user1, user2) => {
    if (!user1 || !user2) throw "Both users must be specified";

    try {
      let chat = await Chat.findOne({
        members: { $all: [user1, user2], $size: 2 },
      });

      if (!chat) {
        chat = await Chat.create({ members: [user1, user2] });
      }

      return chat.toObject();
    } catch (err) {
      logger.error("Error getting/creating chat: " + err);
      throw err;
    }
  };

  this.updateChatOnMessage = async (chatId, messageId) => {
    if (!chatId || !messageId) throw "chatId and messageId are required";

    try {
      return await Chat.findByIdAndUpdate(
        chatId,
        {
          lastMessage: messageId,
          updatedAt: Date.now(),
        },
        { new: true }
      );
    } catch (err) {
      logger.error("Error updating chat: " + err);
      throw err;
    }
  };

  this.getUserChats = async (userId) => {
    if (!userId) throw "userId is required";

    try {
      const chats = await Chat.find({ members: userId })
        .populate("lastMessage", "content timestamp") // only these fields
        .sort({ updatedAt: -1 })
        .lean(); // get plain JS objects

      return chats.map((chat) => ({
        ...chat,
        lastMessage: chat.lastMessage?.content || null,
        lastMessageTimestamp: chat.lastMessage?.timestamp || null,
      }));
    } catch (err) {
      logger.error("Error fetching user chats: " + err);
      throw err;
    }
  };

  this.createChat = async (chatData) => {
    return await Chat.create(chatData);
  };

  this.getChatById = async (chatId) => {
    return await Chat.findById(chatId);
  };
}

module.exports = ChatDatabase;
