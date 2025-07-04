const otpGenerator = require("otp-generator");
const crypto = require("crypto");

exports.generateOtp = () => {
  const otp = otpGenerator.generate(6, {
    upperCase: false,
    specialChars: false,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
  });
  return otp;
};

exports.hashOtp = (otp) => {
  const hash = crypto.createHash("sha256").update(otp).digest("hex");
  return hash;
};
