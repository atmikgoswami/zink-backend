const mongoose = require("mongoose");
const { Schema, model, ObjectId } = mongoose;

const messageSchema = new Schema({
  from: {
    type: ObjectId,
    ref: "User",
    required: true,
  },
  to: {
    type: ObjectId,
    ref: "User",
    required: false, // Not required for group chats
  },
  chatId: {
    type: ObjectId,
    ref: "Chat",
    required: true, // Always required
  },
  messageType: {
    type: String,
    enum: ["text", "image", "voice", "video"],
    default: "text",
  },
  content: {
    type: String,
    required: function () {
      return this.messageType === "text";
    },
  },
  mediaUrl: {
    type: String,
    required: function () {
      return ["image", "voice", "video"].includes(this.messageType);
    },
  },
  caption: {
    type: String,
    trim: true,
  },
  edited: {
    type: Boolean,
    default: false,
  },

  // Private chat: one read timestamp
  readAt: {
    type: Date,
    default: null,
  },

  // Group chat: array of readers
  readBy: [
    {
      user: { type: ObjectId, ref: "User" },
      at: { type: Date, default: Date.now },
    },
  ],

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model("Message", messageSchema);
