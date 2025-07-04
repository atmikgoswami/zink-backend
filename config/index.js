const logger = require("../services/log");

const DEFAULT_BACK_HOST = "localhost";
const DEFAULT_BACK_PORT = 3080;

function validateServerConfiguration() {
  logger.info("Server Configuration:");

  if (!isBackHostConfigured()) {
    process.env.BACK_HOST = DEFAULT_BACK_HOST;
  }
  if (!isBackPortConfigured()) {
    process.env.BACK_PORT = DEFAULT_BACK_PORT;
  }

  const backUri = process.env.BACK_HOST;
  logger.info(`   - Back URI: ${backUri}`);
}

function validateDatabaseConfiguration() {
  logger.info("Database Configuration:");

  if (isMongoDBDatabaseConfigured()) {
    logger.info("   - MongoDB is configured.");
    return;
  }

  logger.error("   - MongoDB connection string not established.");
}

function validateAuthConfiguration() {
  logger.info("Authentication Configuration:");

  if (!isJWTServiceConfigured()) {
    process.env.TOKEN_SECRET = "trustmebro";
  }

  logger.info("   - JWT is configured.");

  // OAuth - Google Provider
  checkGoogleConfigurationProperties();
  if (isGoogleOAuth2ServiceConfigured()) {
    logger.info("   - Google OAuth 2.0 is configured.");
  } else {
    logger.error("   - Google OAuth 2.0 is not configured.");
  }
}

function isBackHostConfigured() {
  return process.env.BACK_HOST !== undefined;
}

function isBackPortConfigured() {
  return process.env.BACK_PORT !== undefined;
}

function isMongoDBDatabaseConfigured() {
  return process.env.DB_CONNECTION_STRING !== undefined;
}

function checkGoogleConfigurationProperties() {
  if (!process.env.GOOGLE_AUTH_CLIENT_ID) {
    logger.warn("   - Google Client ID not established.");
  }
}

function isGoogleOAuth2ServiceConfigured() {
  return process.env.GOOGLE_AUTH_CLIENT_ID;
}

function isJWTServiceConfigured() {
  return process.env.TOKEN_SECRET !== undefined;
}

module.exports = {
  validateServerConfiguration,
  validateDatabaseConfiguration,
  validateAuthConfiguration,
  isGoogleOAuth2ServiceConfigured,
  isJWTServiceConfigured,
};
