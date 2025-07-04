const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

const { verifyJWT } = require("../middlewares");

router.route("/logout").post(verifyJWT, userController.logoutUser);

router.route("/register").post(userController.registerUser);

router.route("/generate-token").post(userController.refreshAccessToken);

router.route("/send-email-otp").post(userController.sendEmailOtp);
router.route("/verify-email-otp").post(userController.verifyEmailOtp);

router.route("/verify-mobile").post(userController.verifyMobile);

module.exports = router;
