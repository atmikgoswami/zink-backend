function ChatController(chatDb, messageDb, logger) {
  this.chatDb = chatDb;
  this.messageDb = messageDb;
  this.logger = logger;

  const { ApiError, ApiResponse, asyncHandler } = require("../utils");

  // Get all chats for logged-in user
  this.getUserChats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const chats = await this.chatDb.getUserChats(userId);

    return res
      .status(200)
      .json(new ApiResponse(200, { chats }, "Chats fetched successfully"));
  });

  // Get messages in a chat (paginated)
  this.getChatMessages = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!chatId) throw new ApiError(400, "chatId is required");

    const messages = await this.messageDb.getMessagesByChatId(
      chatId,
      req.user._id,
      page,
      limit
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, { messages }, "Messages fetched successfully")
      );
  });

  this.sendMessage = asyncHandler(async (req, res) => {
    const { to, chatId, content, messageType, mediaUrl, caption } = req.body;
    const from = req.user._id;

    if (!content) {
      throw new ApiError(400, "Message content is required");
    }

    let chat;

    // 1. If chatId is provided → group or existing chat
    if (chatId) {
      chat = await this.chatDb.getChatById(chatId);
      if (!chat) throw new ApiError(404, "Chat not found");

      console.log("Chat found:", chat);

      const isMember = chat.members.some(
        (m) => m.toString() === from.toString()
      );
      if (!isMember) {
        throw new ApiError(403, "You are not a member of this chat");
      }
    }
    // 2. Otherwise, it's a private chat to someone → get or create
    else {
      if (!to) {
        throw new ApiError(400, "Recipient (to) is required for private chats");
      }

      chat = await this.chatDb.getOrCreateChat(from, to);
    }

    const message = await this.messageDb.createMessage({
      from,
      to:
        chat.chatType === "private"
          ? chat.members.find((id) => id.toString() !== from.toString())
          : null,
      chatId: chat._id,
      content,
      messageType,
      mediaUrl,
      caption,
    });

    await this.chatDb.updateChatOnMessage(chat._id, message._id);

    return res
      .status(201)
      .json(
        new ApiResponse(201, { chatId: chat._id, message }, "Message sent")
      );
  });

  // Mark a message as read
  this.markAsRead = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const readerId = req.user._id;

    if (!messageId) {
      throw new ApiError(400, "messageId is required");
    }

    const message = await this.messageDb.markMessageAsRead(messageId, readerId);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          message,
          readerId,
        },
        "Message marked as read"
      )
    );
  });

  // Create a new group chat
  this.createGroupChat = asyncHandler(async (req, res) => {
    const { name, members, avatar } = req.body;
    const creator = req.user._id;

    if (!name || !members || members.length < 1) {
      throw new ApiError(
        400,
        "Group name and at least one member are required"
      );
    }

    const allMembers = [...new Set([...members, creator.toString()])];

    const newChat = await this.chatDb.createChat({
      members: allMembers,
      chatType: "group",
      name,
      avatar,
      admins: [creator],
    });

    return res
      .status(201)
      .json(new ApiResponse(201, { chat: newChat }, "Group chat created"));
  });

  // Add a member to a group chat
  this.addMemberToGroup = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { memberId } = req.body;
    const adminId = req.user._id;

    const chat = await this.chatDb.getChatById(chatId);

    if (!chat) throw new ApiError(404, "Chat not found");
    if (chat.chatType !== "group") throw new ApiError(400, "Not a group chat");
    if (!chat.admins.includes(adminId)) {
      throw new ApiError(403, "Only admins can add members");
    }

    if (chat.members.includes(memberId)) {
      throw new ApiError(400, "User is already a member");
    }

    chat.members.push(memberId);
    await chat.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { chat }, "Member added successfully"));
  });

  // Remove a member from a group chat
  this.removeMemberFromGroup = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { memberId } = req.body;
    const adminId = req.user._id;

    const chat = await this.chatDb.getChatById(chatId);
    if (!chat) throw new ApiError(404, "Chat not found");
    if (!chat.admins.includes(adminId)) {
      throw new ApiError(403, "Only admins can remove members");
    }

    if (!chat.members.includes(memberId)) {
      throw new ApiError(400, "User is not in the group");
    }

    chat.members = chat.members.filter((m) => m.toString() !== memberId);
    chat.admins = chat.admins.filter((a) => a.toString() !== memberId); // also remove from admins if needed
    await chat.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { chat }, "Member removed"));
  });

  // Promote a member to admin in a group chat
  this.promoteToAdmin = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user._id;

    const chat = await this.chatDb.getChatById(chatId);
    if (!chat.admins.includes(requesterId)) {
      throw new ApiError(403, "Only admins can promote others");
    }

    if (!chat.members.includes(userId)) {
      throw new ApiError(400, "User must be a member to become admin");
    }

    if (!chat.admins.includes(userId)) {
      chat.admins.push(userId);
      await chat.save();
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { chat }, "User promoted to admin"));
  });

  // Demote a group admin to a regular member
  this.demoteFromAdmin = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user._id;

    const chat = await this.chatDb.getChatById(chatId);

    if (!chat) {
      throw new ApiError(404, "Chat not found");
    }

    // Ensure only an admin can demote another admin
    if (!chat.admins.includes(requesterId)) {
      throw new ApiError(403, "Only admins can demote others");
    }

    // Cannot demote someone who isn't an admin
    if (!chat.admins.includes(userId)) {
      throw new ApiError(400, "User is not an admin");
    }

    // Prevent self-demotion (optional)
    if (userId.toString() === requesterId.toString()) {
      throw new ApiError(400, "You cannot demote yourself");
    }

    // Remove user from admins array
    chat.admins = chat.admins.filter(
      (adminId) => adminId.toString() !== userId.toString()
    );

    await chat.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { chat }, "User demoted from admin"));
  });

  // Leave a group chat
  this.leaveGroup = asyncHandler(async (req, res) => {
    const userId = req.user._id.toString();
    const { chatId } = req.params;

    const chat = await this.chatDb.getChatById(chatId);

    if (!chat) throw new ApiError(404, "Chat not found");

    const isMember = chat.members.some((m) => m.toString() === userId);
    if (!isMember) {
      throw new ApiError(400, "You are not part of this group");
    }

    // Remove user from members and admins
    chat.members = chat.members.filter((m) => m.toString() !== userId);
    chat.admins = chat.admins.filter((a) => a.toString() !== userId);

    // Optional: if last member leaves, delete chat
    if (chat.members.length === 0) {
      await chat.deleteOne();
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "You left and group was deleted"));
    }

    // Optional: if last admin left, promote someone else
    if (chat.admins.length === 0 && chat.members.length > 0) {
      chat.admins.push(chat.members[0]); // promote first member
    }

    await chat.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { chat }, "You left the group"));
  });
}

const logger = require("../services/log");
const { chatDatabase, messageDatabase } = require("../services/database");

const chatController = new ChatController(
  chatDatabase,
  messageDatabase,
  logger
);
module.exports = chatController;
