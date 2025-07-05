const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { isEmail, isMobilePhone } = require("validator");
const jwt = require("jsonwebtoken");

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [128, "Maximum password length is 128"],
      validate: [isEmail, "Please enter a valid email"],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (v) {
          return isMobilePhone(v, "en-IN");
        },
        message: (props) =>
          `${props.value} is not a valid mobile number for India!`,
      },
    },
    picture: {
      type: String,
      default: "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      maxlength: [64, "Maximum fullname length is 64"],
    },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      phone: this.phone,
      fullname: this.fullname,
      picture: this.picture,
    },
    process.env.ACCESS_TOKEN_SECRET,
  );
};

const User = model("User", userSchema);

module.exports = User;
