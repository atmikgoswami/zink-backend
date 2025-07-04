const notFound = require("./notFound");
const errorHandler = require("./errorHandler");
const verifyJWT = require("./authMiddleware");

module.exports = {
  notFound,
  errorHandler,
  verifyJWT,
};
