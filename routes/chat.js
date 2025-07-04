const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { verifyJWT } = require("../middlewares");

router.use(verifyJWT); // protect all routes

router.get("/chats", chatController.getUserChats);
router.get("/chats/:chatId/messages", chatController.getChatMessages);
router.post("/messages", chatController.sendMessage);
router.post("/messages/:messageId/read", chatController.markAsRead);

router.post("/group", chatController.createGroupChat);
router.post("/group/:chatId/add", chatController.addMemberToGroup);
router.post("/group/:chatId/remove", chatController.removeMemberFromGroup);
router.post("/group/:chatId/promote", chatController.promoteToAdmin);
router.post("/group/:chatId/demote", chatController.demoteFromAdmin);
router.post("/group/:chatId/leave", chatController.leaveGroup);

module.exports = router;
