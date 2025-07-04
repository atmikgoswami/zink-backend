const UserDatabase = require("./user");
const MessageDatabase = require("./message");
const ChatDatabase = require("./chat");
const connectionInfo = process.env.DB_CONNECTION_STRING;

const database = new UserDatabase(connectionInfo);
const messageDatabase = new MessageDatabase();
const chatDatabase = new ChatDatabase();

module.exports = {
  database,
  messageDatabase,
  chatDatabase,
};
