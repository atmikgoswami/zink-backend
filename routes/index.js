const express = require("express");
const router = express.Router();

const usersApi = require("./user");
const chatApi = require("./chat");

router.use(usersApi);
router.use(chatApi);

module.exports = router;
