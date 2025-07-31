const Application = require("../models/applicationModel");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Get (All, Imcoming, Declined & Approved) Applications from Providers Based on their Status (FE: Organization Route)
async function getApplicationsFromProvidersBaseonStatus(req, res) {
  try {
    // Extract query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const order_by = req.query.order_by || "desc";

    const { id, status } = req.query;

    // Calculate the number of documents to skip
    const skip = (page - 1) * size;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }

    let applications;

    let totalApplications;

    if (status === "all") {
      applications = await Application.find({
        organizationId: id,
        visibility: true,
      })
        .sort({ createdAt: order_by === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(size);

      // Get the total number of applications (for pagination metadata)
      totalApplications = await Application.countDocuments({
        organizationId: id,
        visibility: true,
      });
    } else {
      if (!["pending", "approved", "declined"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      applications = await Application.find({
        organizationId: id,
        status,
        visibility: true,
      })
        .sort({ createdAt: order_by === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(size);

      // Get the total number of applications (for pagination metadata)
      totalApplications = await Application.countDocuments({
        organizationId: id,
        status,
        visibility: true,
      });
    }

    // Calculate total pages
    const totalPages = Math.ceil(totalApplications / size);

    // Return the response with pagination metadata
    res.status(200).json({
      success: true,
      applications,
      pagination: {
        page,
        size,
        totalApplications,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching all applications:", error.message);
    return { success: false, message: error.message };
  }
}

// Get Stats of Providers Applications in Organizations Dashboard  (FE: Organization Route)
async function getApplicationStatsForOrganization(req, res) {
  try {
    const { organizationId } = req.params;

    // Fetch applications and group by status
    const statusStats = await Application.aggregate([
      { $match: { organizationId, visibility: true } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Format the statistics
    const stats = {
      pending: 0,
      approved: 0,
      declined: 0,
    };

    statusStats.forEach((stat) => {
      stats[stat._id] = stat.count;
    });

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching application statistics:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching statistics.",
      error: error.message,
    });
  }
}

// Update (Providers) Filled Applications Based On The Status Passed (FE: Organization Route)
async function updateProviderApplication(req, res) {
  try {
    const { applicationId } = req.params;
    const { status } = req.query;

    console.log(status, "status,statusstatus");

    if (!applicationId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization is required" });
    }

    if (!status) {
      return res
        .status(400)
        .json({ success: false, message: "New Status is required" });
    }

    const application = await Application.findByIdAndUpdate(
      applicationId,
      { status },
      { new: true }
    );

    if (!application) {
      return { success: false, message: "Application not found." };
    }

    return res.status(200).json({
      success: true,
      message: `Application ${status} successfully`,
      application,
    });
  } catch (error) {
    console.log(error);

    return { success: false, message: error.message };
  }
}

// Get Applications of Providers which their Applications have been Approved (FE: Organization Route)

async function getApprovedProviders(req, res) {
  try {
    // Extract query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const order_by = req.query.order_by || "desc";
    const { organizationId } = req.params;

    // Calculate the number of documents to skip
    const skip = (page - 1) * size;

    // Find approved applications for the organization
    const approvedApplications = await Application.find({
      organizationId,
      status: "approved",
      visibility: true,
    });

    if (!approvedApplications || approvedApplications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No approved applications found for this organization.",
      });
    }

    // Extract userIds from approved applications
    const userIds = approvedApplications.map((app) => app.userId);

    // Fetch user details using the userIds, ensuring the status is "active"
    const users = await User.find({
      _id: { $in: userIds },
      status: "active",
    })
      .sort({ createdAt: order_by === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(size);

    // Get the total number of active users (for pagination metadata)
    const totalUsers = await User.countDocuments({
      _id: { $in: userIds },
      status: "active",
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / size);

    // Return the users and their corresponding applications
    const response = users.map((user) => ({
      provider: user,
      applications: approvedApplications.filter(
        (app) => app.userId.toString() === user._id.toString()
      ),
    }));

    return res.status(200).json({
      success: true,
      data: response,
      pagination: {
        page,
        size,
        totalUsers,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching approved applications and users:",
      error.message
    );
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while fetching approved applications and users.",
      error: error.message,
    });
  }
}

async function getUserDetailsByBearerToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const credentialingProviderId = decoded.id;

    const application = await Application.findOne({
      userId: credentialingProviderId,
      status: "approved",
    }).populate("userId", "-password");

    if (!application) {
      return {
        success: false,
        message: "No approved application found for this user.",
      };
    }

    const userDetails = application.userId;
    return { success: true, userDetails };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  getApplicationsFromProvidersBaseonStatus,
  updateProviderApplication,
  getUserDetailsByBearerToken,
  getApprovedProviders,
  getApplicationStatsForOrganization,
};
