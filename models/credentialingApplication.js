const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  applicationName: { type: String, required: true },
  applicationTitle: { type: String, required: true },
  status: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  visibility: {
    type: Boolean,

    default: true,
  },
});

module.exports = mongoose.model("Credapplication", ApplicationSchema);
