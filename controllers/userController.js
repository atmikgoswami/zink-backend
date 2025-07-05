function UserController(database, logger) {
  this.database = database;
  this.logger = logger;

  const { ApiError, ApiResponse, asyncHandler } = require("../utils");

  const jwt = require("jsonwebtoken");
  const admin = require("../services/firebase");

  const emailUtil = require("../utils/emailUtil");
  const redis = require("../services/redisClient");
  const { generateOtp, hashOtp } = require("../utils/otp");

  this.sendEmailOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    const otp = generateOtp();
    const key = `otp:email:${email}`;
    const hashed = hashOtp(otp);

    // Store hashed OTP in Redis for 3 minutes
    await redis.set(key, hashed, "EX", 180);

    // Send OTP via email
    await emailUtil({
      email: email,
      subject: "Zink - Fast Chat Messaging",
      html: `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <p>Dear User,</p>

      <p>Please use the One-Time Password (OTP) below to verify your email address:</p>

      <p style="font-size: 1.5em; font-weight: bold; color: #007bff;">${otp}</p>

      <p>This OTP is valid for 3 minutes. Do not share it with anyone.</p>

      <p>If you did not initiate this request, you can safely ignore this email.</p>

      <p>Warm regards,<br />The Zink Team</p>
    </div>
  `,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { success: true },
          "OTP sent successfully to your email"
        )
      );
  });

  this.verifyEmailOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) throw new ApiError(400, "Phone and OTP are required");

    const key = `otp:email:${email}`;
    const storedHashed = await redis.get(key);

    if (!storedHashed) {
      throw new ApiError(400, "OTP expired or invalid");
    }

    if (storedHashed !== hashOtp(otp)) {
      throw new ApiError(400, "Incorrect OTP");
    }

    // Clean up OTP after successful verification
    await redis.del(key);

    await redis.set(`verified:email:${email}`, true, "EX", 600);

    return res
      .status(200)
      .json(new ApiResponse(200, { email }, "Email Address verified"));
  });

  this.generateAccessAndRefreshToken = async (id) => {
    try {
      const user = await this.database.getUserById(id);
      const accessToken = await user.generateAccessToken();
      const refreshToken = await user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      return { accessToken, refreshToken };
    } catch (error) {
      throw new ApiError(
        500,
        error?.message ||
          "Something went wrong while generating Access and Refresh tokens"
      );
    }
  };

  this.verifyMobile = asyncHandler(async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
      throw new ApiError(400, "idToken is required");
    }

    console.log("Verifying mobile with idToken:", idToken);

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const phoneNumber = decodedToken.phone_number;

      if (!phoneNumber) {
        throw new ApiError(400, "Phone number not found in token");
      }

      await redis.set(`verified:phone:${phoneNumber}`, true, "EX", 600);

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { phone: phoneNumber },
            "Mobile number verified successfully"
          )
        );
    } catch (err) {
      console.error("Firebase token verification failed", err);
      throw new ApiError(401, "Invalid or expired ID token");
    }
  });

  this.registerUser = asyncHandler(async (req, res) => {
    const { email, phone, name, picture } = req.body;

    if (!email || !phone || !name) {
      throw new ApiError(400, "Email, phone, and name are required");
    }

    const emailVerified = await redis.get(`verified:email:${email}`);
    const phoneVerified = await redis.get(`verified:phone:${phone}`);

    if (!emailVerified || !phoneVerified) {
      throw new ApiError(
        400,
        "Both email and mobile must be verified before registration"
      );
    }

    let user = await this.database.getUserByEmail(email);

    if (!user) {
      const newUserData = {
        email,
        phone,
        fullname: name,
        emailVerified: true,
        phoneVerified: true,
      };

      if (picture) {
        newUserData.picture = picture;
      }

      user = await this.database.createUser(newUserData);

      if (!user) {
        throw new ApiError(500, "User registration failed");
      }
    }

    await redis.del(`verified:email:${email}`);
    await redis.del(`verified:phone:${phone}`);

    const { accessToken, refreshToken } =
      await this.generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { user, accessToken, refreshToken },
          "User registration (or login) successful"
        )
      );
  });

  this.logoutUser = asyncHandler(async (req, res) => {
    const user = await this.database.clearUserRefreshTokenById(req.user._id);

    if (!user) {
      throw new ApiError(400, "Failed to update user refreshToken");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged out successfully"));
  });

  this.refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request - refresh token required");
    }

    try {
      const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      if (!decodedToken) {
        throw new ApiError(401, "Invalid refresh token");
      }

      const user = await this.database.getUserById(decodedToken._id);

      if (!user) {
        throw new ApiError(401, "User does not exist");
      }

      console.log("db:", user.refreshToken);
      console.log("incoming", incomingRefreshToken);

      if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Invalid refresh token");
      }

      const { accessToken, refreshToken } =
        await this.generateAccessAndRefreshToken(user._id);

      const options = {
        httpOnly: true,
        secure: true,
      };

      res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
          new ApiResponse(
            200,
            {
              accessToken,
              refreshToken,
            },
            "new tokens generated successfully"
          )
        );
    } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token");
    }
  });
}

const logger = require("../services/log");
const { database } = require("../services/database");
const userController = new UserController(database, logger);

module.exports = userController;
