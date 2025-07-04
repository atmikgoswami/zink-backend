const mongoose = require("mongoose");
const { Schema, model, ObjectId } = mongoose;

const chatSchema = new Schema(
  {
    members: [{ type: ObjectId, ref: "User" }],
    chatType: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },
    name: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    admins: [{ type: ObjectId, ref: "User" }],
    lastMessage: {
      type: ObjectId,
      ref: "Message",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = model("Chat", chatSchema);
