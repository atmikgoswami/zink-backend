require("dotenv").config();
const logger = require("./services/log");
const setupSocket = require("./services/socket");
const http = require("http");
const app = require("./app");

const { database } = require("./services/database");
const envValidator = require("./config");

logger.info("Checking configuration...");
envValidator.validateServerConfiguration();
envValidator.validateDatabaseConfiguration();
envValidator.validateAuthConfiguration();

logger.info("Deploying server...");

database
  .connect()
  .then(() => {
    logger.info("Database successfully connected");

    const server = http.createServer(app);
    setupSocket(server);

    const backUri = `${process.env.BACK_HOST}`;
    const PORT = process.env.BACK_PORT;

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on ${backUri}`);
    });
  })
  .catch((err) => {
    logger.error("Failed to connect to DB:", err);
  });
