const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  accountType: {
    type: String,
    enum: ["provider", "organization", "super_admin"],
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active",
  },
  fullName: { type: String, required: true },
  professionalTitle: { type: String },
  refreshToken: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  profilePicture: { type: String },
  profileStatus: { type: Number, default: 33 },
  otpCreatedAt: { type: Date },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false },
  groups: {
    type: [String],
  },
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
