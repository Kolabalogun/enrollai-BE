const Organization = require("../models/Organization");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const generateOtp = require("../utils/generateOTP");
const emailTemplates = require("../utils/emailTemplate");
const sendEmail = require("../utils/sendEmail");
const { logActivity } = require("./activityController");
const OrgApplication = require("../models/credentialingApplication");
const Application = require("../models/applicationModel");
const User = require("../models/User");
require("dotenv").config();

const registerOrganization = async (req, res) => {
  try {
    const {
      accountType,
      organizationName,
      administratorFullName,
      workEmail,
      password,
    } = req.body;

    let user = await User.findOne({ email: workEmail });
    if (user) return res.status(400).json({ msg: "User already exists" });

    const existingOrganization = await Organization.findOne({ workEmail });
    const existingOrganizationName = await Organization.findOne({
      organizationName,
    });
    if (existingOrganization) {
      return res
        .status(400)
        .json({ message: "Organization with this email already exists" });
    }
    if (existingOrganizationName) {
      return res
        .status(400)
        .json({ message: "Organization with this name already exists" });
    }

    const newOrganization = new Organization({
      accountType,
      organizationName,
      administratorFullName,
      workEmail,
      password,
    });

    newOrganization.otp = generateOtp();
    newOrganization.otpCreatedAt = new Date();

    await newOrganization.save();

    const emailSubject = "OTP Verification Code";
    const emailText = emailTemplates.otpVerification(newOrganization.otp);

    await sendEmail(newOrganization.workEmail, emailSubject, emailText);

    res.status(201).json({
      message: "Organization registered successfully",
    });
  } catch (error) {
    console.error("Error registering organization:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const verifyOrganizationOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const organization = await Organization.findOne({ workEmail: email });

    if (!organization) {
      return res.status(400).json({ msg: "Organization not found" });
    }

    const otpExpiryDuration = 15 * 60 * 1000;
    const currentTime = Date.now();

    if (
      currentTime - new Date(organization.otpCreatedAt).getTime() >
      otpExpiryDuration
    ) {
      return res.status(400).json({ msg: "OTP has expired" });
    }

    if (organization.otp !== otp) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    organization.isVerified = true;
    organization.otp = undefined;
    organization.otpCreatedAt = undefined;
    await organization.save();

    res.status(200).json({ msg: "OTP verified, account activated" });
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
};

const loginOrganization = async (req, res) => {
  try {
    const { workEmail, password } = req.body;
    const organization = await Organization.findOne({ workEmail });
    if (!organization) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const isMatch = await bcrypt.compare(password, organization.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!organization.isVerified)
      return res
        .status(400)
        .json({ msg: "Account not verified. Please verify your email." });

    if (organization.status === "suspended")
      return res.status(403).json({
        msg: "Your account have been suspended. Please Contact Support.",
      });

    const accessToken = jwt.sign(
      { userId: organization._id, accountType: "organization" },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // Generate Refresh Token (expires in 6 hours)
    const refreshToken = jwt.sign(
      { userId: organization._id },
      process.env.REFRESH_SECRET,
      { expiresIn: "4h" }
    );

    organization.refreshToken = refreshToken;
    await organization.save();

    await logActivity(organization._id, "login", "User logged in successfully");

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      organization: {
        id: organization._id,
        organizationName: organization.organizationName,
        administratorFullName: organization.administratorFullName,
        workEmail: organization.workEmail,
        accountType: "organization",
        ...organization._doc,
      },
    });
  } catch (error) {
    console.error("Error logging in organization:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const forgotOrganizationPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const organization = await Organization.findOne({ workEmail: email });
    if (!organization)
      return res.status(400).json({ msg: "Organization not found" });

    organization.otp = generateOtp();
    organization.otpCreatedAt = new Date();

    await organization.save();

    const emailSubject = "Password Reset OTP";
    const emailText = emailTemplates.otpVerification(organization.otp);

    await sendEmail(organization.workEmail, emailSubject, emailText);

    res.status(200).json({ msg: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
};
const resetOrganizationPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const organization = await Organization.findOne({ workEmail: email });

    organization.password = newPassword;
    organization.otp = undefined;
    await organization.save();

    res.status(200).json({ msg: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
};

const resendOrganizationOtp = async (req, res) => {
  const { email } = req.params;

  try {
    const organization = await Organization.findOne({ workEmail: email });
    if (!organization)
      return res.status(400).json({ msg: "Organization not found" });

    if (!organization.isVerified) {
      organization.otp = generateOtp();
      organization.otpCreatedAt = new Date();
      await organization.save();

      const emailSubject = "OTP Verification Code";
      const emailText = emailTemplates.otpVerification(organization.otp);

      await sendEmail(organization.workEmail, emailSubject, emailText);

      console.log(organization);
      res.status(200).json({ msg: "New OTP sent to your email" });
    } else {
      res.status(400).json({ msg: "Account is already verified" });
    }
  } catch (error) {
    console.log(error);

    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

const authenticateOrganization = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Authorization token is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.organizationId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const getOrganizationDetails = async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId).select(
      "-password"
    );
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }
    res.status(200).json({
      success: true,
      organization: {
        id: organization._id,
        organizationName: organization.organizationName,
        administratorFullName: organization.administratorFullName,
        workEmail: organization.workEmail,
        createdAt: organization.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching organization details:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const getOrganizationDetailsByID = async (req, res) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findById(id).select("-password");

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Return the organization details
    res.status(200).json({
      success: true,
      organization: {
        id: organization._id,
        organizationName: organization.organizationName,
        administratorFullName: organization.administratorFullName,
        workEmail: organization.workEmail,
        createdAt: organization.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching organization details:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getAllOrganizations = async (req, res) => {
  try {
    // Fetch all organizations, excluding sensitive fields like password
    const organizations = await Organization.find().select("-password");

    if (!organizations || organizations.length === 0) {
      res.status(200).json({
        success: true,
        count: 0,
        organizations: [],
      });
    }

    // Map organizations to include only desired fields
    const formattedOrganizations = organizations.map((org) => ({
      id: org._id,
      organizationName: org.organizationName,
      administratorFullName: org.administratorFullName,
      workEmail: org.workEmail,
      createdAt: org.createdAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedOrganizations.length,
      organizations: formattedOrganizations,
    });
  } catch (error) {
    console.error("Error fetching all organizations:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const updateOrganizationDetails = async (req, res) => {
  try {
    const {
      organizationName,
      administratorFullName,
      workEmail,
      profilePicture,
    } = req.body;

    const updateData = {
      organizationName,
      administratorFullName,
      workEmail,
    };

    // Add profilePicture to updateData if it exists
    if (profilePicture) updateData.profilePicture = profilePicture;

    // Use findByIdAndUpdate to update the organization and return the full document
    const updatedOrganization = await Organization.findByIdAndUpdate(
      req.organizationId,
      updateData,
      { new: true, runValidators: true }
    );

    // If no organization is found, return a 404 error
    if (!updatedOrganization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Log the activity
    await logActivity(
      req.organizationId,
      "update profile",
      "User updated profile successfully"
    );

    // Return the updated organization document
    res.status(200).json({
      success: true,
      message: "Organization details updated successfully",
      organization: updatedOrganization,
    });
  } catch (error) {
    console.error("Error updating organization details:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const changeOrganizationPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const organization = await Organization.findById(req.organizationId);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, organization.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    organization.password = await bcrypt.hash(newPassword, salt);
    await organization.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing organization password:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteOrganization = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    //  Find and delete the organization
    const organization = await Organization.findByIdAndDelete(organizationId);

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    //   Delete all applications created by the organization
    await OrgApplication.deleteMany({ organization: organizationId });

    // Delete All Providers Applications related to the Organization
    await Application.deleteMany({ organizationId: organizationId });

    //  Return success response
    res.status(200).json({
      success: true,
      message:
        "Organization account and all associated applications deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting organization account:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const clearAllOrganizationsCreatedApplications = async (req, res) => {
  try {
    // Delete all organizations from the database
    const result = await OrgApplication.deleteMany({});

    // Check if any organizations were deleted
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No organizations Created Applications found to delete.",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "All organizations Created Applications have been deleted successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error(
      "Error clearing organizations Created Applications:",
      error.message
    );
    res.status(500).json({
      success: false,
      message: "An error occurred while clearing organizations.",
      error: error.message,
    });
  }
};

const clearAllOrganizations = async (req, res) => {
  try {
    // Delete all organizations from the database
    const result = await Organization.deleteMany({});

    // Check if any organizations were deleted
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No organizations found to delete.",
      });
    }

    res.status(200).json({
      success: true,
      message: "All organizations have been deleted successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing organizations:", error.message);
    res.status(500).json({
      success: false,
      message: "An error occurred while clearing organizations.",
      error: error.message,
    });
  }
};

module.exports = {
  authenticateOrganization,
  verifyOrganizationOtp,
  forgotOrganizationPassword,
  resendOrganizationOtp,
  resetOrganizationPassword,
  registerOrganization,
  loginOrganization,
  registerOrganization,
  loginOrganization,
  getOrganizationDetails,
  updateOrganizationDetails,
  changeOrganizationPassword,
  getAllOrganizations,
  getOrganizationDetailsByID,
  deleteOrganization,
  clearAllOrganizations,
  clearAllOrganizationsCreatedApplications,
};
