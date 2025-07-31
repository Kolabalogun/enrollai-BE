const ActivityLog = require("../models/ActivityLog");

const logActivity = async (userId, actionType, actionDetails) => {
  try {
    const newActivity = new ActivityLog({
      user: userId,
      actionType,
      actionDetails,
    });

    await newActivity.save();
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

const createActivityLog = async (req, res) => {
  try {
    const { actionType, actionDetails } = req.body;
    const userId = req.user.id;
    await logActivity(userId, actionType, actionDetails);

    return res.status(201).json({ message: "Activity logged successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error logging activity", error });
  }
};

const getRecentActivities = async (req, res) => {
  try {
    const userId = req.user.id;

    const activities = await ActivityLog.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(10);

    return res.status(200).json({ activities });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching activities", error });
  }
};

const getAllActivities = async (req, res) => {
  try {
    const activities = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(10);

    return res.status(200).json({ activities });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching activities", error });
  }
};

const getUserRecentActivities = async (req, res) => {
  try {
    await getRecentActivities(req, res);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching activities", error });
  }
};

module.exports = {
  logActivity,
  createActivityLog,
  getRecentActivities,
  getAllActivities,
  getUserRecentActivities,
};
