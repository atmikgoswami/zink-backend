const { ApiError } = require("../utils");

const errorMiddleware = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // For other types of errors, we can have a generic response
  return res.status(500).json({
    statusCode: 500,
    message: "Internal Server Error",
    success: false,
    errors: [],
    stack: err.stack,
  });
};

module.exports = errorMiddleware;
