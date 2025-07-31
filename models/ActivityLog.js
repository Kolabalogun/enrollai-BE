const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actionType: {
    type: String,
    enum: [
      "login",
      "update profile",
      "delete-application",
      "approve-application",
      "createapplication",
      "create-application",
      "delete-application",
      "toggle-application-status",
      "create admin user",
      "change user status",
    ],
    required: true,
  },
  actionDetails: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

module.exports = ActivityLog;
