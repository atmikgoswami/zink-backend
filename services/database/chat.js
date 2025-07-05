function ChatDatabase() {
  const logger = require("../log");
  const Chat = require("../../models/chat");
  const User = require("../../models/user");

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
        .populate("lastMessage", "content timestamp")
        .sort({ updatedAt: -1 })
        .lean();

      const allUserIdsSet = new Set();

      const formattedChats = chats.map((chat) => {
        chat.members.forEach((id) => allUserIdsSet.add(id.toString()));
        chat.admins.forEach((id) => allUserIdsSet.add(id.toString()));

        return {
          id: chat._id.toString(),
          members: chat.members.map((m) => m.toString()),
          chatType: chat.chatType,
          name: chat.name || null,
          avatar: chat.avatar || null,
          admins: chat.admins.map((a) => a.toString()),
          lastMessage: chat.lastMessage?.content || null,
          lastMessageTime: chat.lastMessage?.timestamp
            ? new Date(chat.lastMessage.timestamp).getTime()
            : null,
        };
      });

      const userIds = Array.from(allUserIdsSet);

      const users = await User.find({ _id: { $in: userIds } }).lean();

      return {
        chats: formattedChats,
        users,
      };
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
