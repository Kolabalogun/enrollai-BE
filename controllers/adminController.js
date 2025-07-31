const Application = require("../models/applicationModel");
const Organization = require("../models/Organization");
const User = require("../models/User");
const generateOtp = require("../utils/generateOTP");
const emailTemplates = require("../utils/emailTemplate");
const { logActivity } = require("../controllers/activityController");
const sendEmail = require("../utils/sendEmail");
const OrgApplication = require("../models/credentialingApplication");

// Create a new admin account (FE: Admin Route)
exports.createSuperAdmin = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists. Please use a different email.",
      });
    }

    const newSuperAdmin = new User({
      fullName,
      email,
      password,
      accountType: "super_admin",
      profilePicture: null,
      createdAt: new Date(),
    });

    newSuperAdmin.otp = generateOtp();
    newSuperAdmin.otpCreatedAt = new Date();

    await newSuperAdmin.save();

    const emailSubject = "Admin OTP Verification Code";
    const emailText = emailTemplates.otpVerification(newSuperAdmin.otp);

    await sendEmail(newSuperAdmin.email, emailSubject, emailText);

    // await logActivity(
    //   req.user._id,
    //   "create admin user",
    //   "You created a new admin account"
    // );

    res.status(201).json({
      success: true,
      message: "Super admin created successfully.",
      data: {
        id: newSuperAdmin._id,
        fullName: newSuperAdmin.fullName,
        email: newSuperAdmin.email,
        accountType: newSuperAdmin.accountType,
      },
    });
  } catch (error) {
    console.error("Error creating super admin:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

//  Get (All, Imcoming, Declined & Approved) Applications from Providers Based on their Status (FE: Admin Route)
exports.getAllApplicationsBasedOnStatus = async (req, res) => {
  try {
    // Extract query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 5;
    const order_by = req.query.order_by || "desc";

    const { status } = req.query;

    // Calculate the number of documents to skip
    const skip = (page - 1) * size;

    let applications;

    let totalApplications;

    if (status === "all") {
      applications = await Application.find()
        .populate("userId", "fullName email organizationApplication")
        .sort({ createdAt: order_by === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(size);

      // Get the total number of applications (for pagination metadata)
      totalApplications = await Application.countDocuments();
    } else {
      if (!["pending", "approved", "declined"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      applications = await Application.find({
        status,
      })
        .sort({ createdAt: order_by === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(size);

      // Get the total number of applications (for pagination metadata)
      totalApplications = await Application.countDocuments({
        status,
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
    console.error("Error fetching applications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications. Please try again later.",
    });
  }
};

// Get Stats Applications in Admin Dashboard (FE: Admin Route)
exports.getApplicationStats = async (req, res) => {
  try {
    // Aggregate applications by status and count them
    const stats = await Application.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert the array of stats into an object for easier access
    const statsObject = stats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    // Return the stats object
    res.status(200).json({
      success: true,
      stats: {
        pending: statsObject.pending || 0,
        approved: statsObject.approved || 0,
        declined: statsObject.declined || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching application statistics",
      error: error.message,
    });
  }
};

// Get All Admin Users   (FE: Admin Route)
exports.getAllAdmins = async (req, res) => {
  try {
    // Extract query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 5;
    const order_by = req.query.order_by || "desc";

    // Calculate the number of documents to skip
    const skip = (page - 1) * size;

    //  Fetch all admins
    const admins = await User.find({ accountType: "super_admin" })
      .select("-password")
      .sort({ createdAt: order_by === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(size);

    admins.forEach((admin) => {
      if (typeof admin.createdAt === "string") {
        admin.createdAt = new Date(admin.createdAt);
      }
    });

    // Sort admins by createdAt in descending order
    admins.sort((a, b) => b.createdAt - a.createdAt);

    // Get the total number of Users (for pagination metadata)
    const totalUsers = await User.countDocuments({
      accountType: "super_admin",
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / size);

    // Return the response with pagination metadata
    res.status(200).json({
      success: true,
      data: admins,
      pagination: {
        page,
        size,
        totalUsers,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching admins:  ", error.message);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching admins  ",
      error: error.message,
    });
  }
};

// Get All Providers Users   (FE: Admin Route)
exports.getAllProviders = async (req, res) => {
  try {
    // Extract query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 5;
    const order_by = req.query.order_by || "desc";

    // Calculate the number of documents to skip
    const skip = (page - 1) * size;
    //  Fetch all providers
    const providers = await User.find({ accountType: "provider" })
      .select("-password")
      .sort({ createdAt: order_by === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(size);

    providers.forEach((admin) => {
      if (typeof admin.createdAt === "string") {
        admin.createdAt = new Date(admin.createdAt);
      }
    });

    // Sort providers by createdAt in descending order
    providers.sort((a, b) => b.createdAt - a.createdAt);

    //   Extract provider IDs
    const providerIds = providers.map((provider) => provider._id);

    // Step 3: Fetch all applications for these providers
    const applications = await Application.find({
      userId: { $in: providerIds },
    });

    //   Combine provider data with their applications
    const response = providers.map((provider) => ({
      provider: provider,
      applications: applications.filter(
        (app) => app.userId.toString() === provider._id.toString()
      ),
    }));

    // Get the total number of Users (for pagination metadata)
    const totalUsers = await User.countDocuments({
      accountType: "provider",
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / size);

    // Return the response with pagination metadata
    res.status(200).json({
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
      "Error fetching providers and their applications:",
      error.message
    );
    res.status(500).json({
      success: false,
      message:
        "An error occurred while fetching providers and their applications.",
      error: error.message,
    });
  }
};

// Get All Organizations Users   (FE: Admin Route)
exports.getAllOrganizations = async (req, res) => {
  try {
    // Extract query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 5;
    const order_by = req.query.order_by || "desc";

    // Calculate the number of documents to skip
    const skip = (page - 1) * size;

    const organizations = await Organization.find({
      accountType: "organization",
    })
      .select("-password")
      .sort({ createdAt: order_by === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(size);

    organizations.forEach((admin) => {
      if (typeof admin.createdAt === "string") {
        admin.createdAt = new Date(admin.createdAt);
      }
    });

    // Sort organizations by createdAt in descending order
    organizations.sort((a, b) => b.createdAt - a.createdAt);

    // Get the total number of Users (for pagination metadata)
    const totalUsers = await User.countDocuments({
      accountType: "super_admin",
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / size);

    // Return the response with pagination metadata
    res.status(200).json({
      success: true,
      data: organizations,
      pagination: {
        page,
        size,
        totalUsers,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching credentialing organizations:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// Change Status of a Provider or Organization Account (FE: Admin Route)
exports.changeAccountStatus = async (req, res) => {
  try {
    const { id, type, status } = req.query;

    if (!type) {
      return res
        .status(400)
        .json({ message: "Provider or Organization type is required" });
    }

    if (!status) {
      return res.status(400).json({ message: "New status is required" });
    }

    let user;

    if (type === "provider") {
      user = await User.findById(id);
    } else if (type === "organization") {
      user = await Organization.findById(id);
    } else {
      return res.status(400).json({ message: "Invalid type specified" });
    }

    if (!user) {
      return res
        .status(404)
        .json({ message: "User or Organization not found" });
    }

    // Determine the new visibility based on the status
    const newVisibility = status === "active" ? true : false;

    if (type === "provider") {
      // Update visibility for all applications submitted by the provider
      await Application.updateMany(
        { userId: id },
        { visibility: newVisibility }
      );
    } else if (type === "organization") {
      // Update visibility for all providers' applications related to the organization
      await Application.updateMany(
        { organizationId: id },
        { visibility: newVisibility }
      );

      // Update visibility for all applications created by the organization
      await OrgApplication.updateMany(
        { organization: id },
        { status: newVisibility }
      );
    }

    // Update the status of the user or organization
    user.status = status;

    // Save the updated user or organization
    await user.save();

    // Log the activity
    await logActivity(
      req.user._id,
      "change user status",
      `User status changed to ${user.status}`
    );

    // Return the updated user or organization
    res.status(200).json({
      message: "User status successfully changed",
      user,
    });
  } catch (error) {
    console.error("Error in changeAccountStatus:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Delete Provider Or Organization Account Along side all thier Applications  (FE: Admin Route)
exports.deleteProviderOrOrganization = async (req, res) => {
  try {
    const { id, type } = req.query;

    if (!type) {
      return res
        .status(400)
        .json({ message: "Provider or Organization type is required" });
    }

    let user;

    if (type === "provider") {
      user = await User.findByIdAndDelete(id);
    } else if (type === "organization") {
      user = await Organization.findByIdAndDelete(id);
    } else {
      return res.status(400).json({ message: "Invalid type specified" });
    }

    if (!user) {
      return res
        .status(404)
        .json({ message: "User or Organization not found" });
    }

    if (type === "provider") {
      // Delete all applications created by the user
      await Application.deleteMany({ userId: id });
    } else if (type === "organization") {
      // Delete all providers' applications related to the organization
      await Application.deleteMany({ organizationId: id });

      // Delete all applications created by the organization
      await OrgApplication.deleteMany({ organization: id });
    }

    res
      .status(200)
      .json({ message: "User or Organization deleted successfully" });
  } catch (error) {
    console.error("Error in deleteProviderOrOrganization:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Delete Admin Account (FE: Admin Route)
exports.deleteAdminAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "User account deleted successfully" });
  } catch (error) {
    console.error("Error deleting user account:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
