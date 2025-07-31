const Application = require("../models/applicationModel");
const OrgApplication = require("../models/credentialingApplication");
const User = require("../models/User");
const OrganizationApplication = require("../models/credentialingApplication");
const { logActivity } = require("../controllers/activityController");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");

cloudinary.config({
  cloud_name: "dd0qqm1dv",
  api_key: "413435297586887",
  api_secret: "jGkEg5T9vAG2phRKmkBJCsPJ_Xs",
});

const createApplication = async (req, res) => {
  try {
    const {
      applicationType,
      step1,
      step2,
      step3,
      organizationApplicationId,
      applicationTitle,
      organizationName,
      organizationId,
      medicaidCertificate: medicaidCertificateURLString,
      ECFMGFile: ECFMGFileURLString,
      controlledSubstanceExpirationFile:
        controlledSubstanceExpirationFileURLString,
      deaExpirationFile: deaExpirationFileURLString,
      stateMedicalLicensefile1: stateMedicalLicensefile1URLString,
      stateMedicalLicensefile2: stateMedicalLicensefile2URLString,
      stateMedicalLicensefile3: stateMedicalLicensefile3URLString,
      certificationfile1: certificationfile1URLString,
      certificationfile2: certificationfile2URLString,
      certificationfile3: certificationfile3URLString,
    } = req.body;

    const files = req.files || {};

    const {
      medicaidCertificate,
      ECFMGFile,
      controlledSubstanceExpirationFile,
      deaExpirationFile,
      stateMedicalLicensefile1,
      stateMedicalLicensefile2,
      stateMedicalLicensefile3,
      certificationfile1,
      certificationfile2,
      certificationfile3,
    } = files;

    console.log(req.files, "Files received by multer");
    console.log(req.body, "Parsed body from multer");

    // Parse JSON strings into objects
    const parsedStep1 = JSON.parse(step1);
    const parsedStep2 = JSON.parse(step2);
    const parsedStep3 = JSON.parse(step3);

    const userId = req.user._id;

    // Validate the organizationApplicationId
    if (!mongoose.Types.ObjectId.isValid(organizationApplicationId)) {
      return res
        .status(400)
        .json({ message: "Invalid organization application ID" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const organizationApplication = await OrganizationApplication.findById(
      organizationApplicationId
    ).select("-password");
    if (!organizationApplication) {
      return res
        .status(404)
        .json({ message: "Organization application not found" });
    }

    // Function to upload a file to Cloudinary
    const uploadToCloudinary = async (file) => {
      try {
        if (file && file.buffer) {
          const result = await new Promise((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  resource_type: "auto",
                  folder: `${userId} files`,
                },
                (error, response) => {
                  if (error) {
                    reject(new Error("Failed to upload file to Cloudinary"));
                  }
                  resolve(response);
                }
              )
              .end(file.buffer);
          });
          console.log("Cloudinary upload success:", result);
          return result.secure_url;
        } else if (file && file.path) {
          const response = await cloudinary.uploader.upload(file.path, {
            resource_type: "auto",
            folder: `${userId} files`,
          });
          console.log("Cloudinary upload success:", response);
          return response.secure_url;
        } else {
          throw new Error("Invalid file format");
        }
      } catch (error) {
        console.error("Error in uploadToCloudinary:", error);
        throw error;
      }
    };

    // Handle files and URL strings
    parsedStep2.medicalLicenses.medicaidCertificate =
      medicaidCertificateURLString ||
      (medicaidCertificate && medicaidCertificate[0]
        ? await uploadToCloudinary(medicaidCertificate[0])
        : null);

    parsedStep2.medicalLicenses.ECFMGFile =
      ECFMGFileURLString ||
      (ECFMGFile && ECFMGFile[0]
        ? await uploadToCloudinary(ECFMGFile[0])
        : null);

    parsedStep2.medicalLicenses.controlledSubstanceExpirationFile =
      controlledSubstanceExpirationFileURLString ||
      (controlledSubstanceExpirationFile && controlledSubstanceExpirationFile[0]
        ? await uploadToCloudinary(controlledSubstanceExpirationFile[0])
        : null);

    parsedStep2.medicalLicenses.deaExpirationFile =
      deaExpirationFileURLString ||
      (deaExpirationFile && deaExpirationFile[0]
        ? await uploadToCloudinary(deaExpirationFile[0])
        : null);

    parsedStep2.otherMedLicenses.stateMedicalLicensefile1 =
      stateMedicalLicensefile1URLString ||
      (stateMedicalLicensefile1 && stateMedicalLicensefile1[0]
        ? await uploadToCloudinary(stateMedicalLicensefile1[0])
        : null);

    parsedStep2.otherMedLicenses.stateMedicalLicensefile2 =
      stateMedicalLicensefile2URLString ||
      (stateMedicalLicensefile2 && stateMedicalLicensefile2[0]
        ? await uploadToCloudinary(stateMedicalLicensefile2[0])
        : null);

    parsedStep2.otherMedLicenses.stateMedicalLicensefile3 =
      stateMedicalLicensefile3URLString ||
      (stateMedicalLicensefile3 && stateMedicalLicensefile3[0]
        ? await uploadToCloudinary(stateMedicalLicensefile3[0])
        : null);

    parsedStep3.boards.certificationfile1 =
      certificationfile1URLString ||
      (certificationfile1 && certificationfile1[0]
        ? await uploadToCloudinary(certificationfile1[0])
        : null);

    parsedStep3.boards.certificationfile2 =
      certificationfile2URLString ||
      (certificationfile2 && certificationfile2[0]
        ? await uploadToCloudinary(certificationfile2[0])
        : null);

    parsedStep3.boards.certificationfile3 =
      certificationfile3URLString ||
      (certificationfile3 && certificationfile3[0]
        ? await uploadToCloudinary(certificationfile3[0])
        : null);

    // Create the application
    const newApplication = new Application({
      userId,
      applicationType,
      applicationTitle,
      organizationName,
      step1: parsedStep1,
      step2: parsedStep2,
      step3: parsedStep3,
      organizationApplication: organizationApplicationId,
      organizationId,
    });

    await newApplication.save();
    await User.findByIdAndUpdate(userId, { profileStatus: 88 }, { new: true });
    await logActivity(
      user._id,
      "create-application",
      "User created an application successfully"
    );

    res.status(201).json({
      message: "Application created successfully",
      application: newApplication,
    });
  } catch (error) {
    console.error("Error creating user application:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const getApplicationById = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await Application.findById(applicationId).populate(
      "userId"
    );

    res.status(200).json({ application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get User Most Recent Application Details (FE: Provider Route)
const getMostRecentApplication = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(userId, "userIduserIduserId");
    // Find the most recent application for the user
    const recentApplication = await Application.findOne({ userId })
      .sort({ createdAt: -1 })
      .exec();

    res.status(200).json({
      message: "Most recent application retrieved successfully",
      application: recentApplication,
    });
  } catch (error) {
    console.error("Error retrieving most recent application:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const getApplicationsByStatusAndUserId = async (req, res) => {
  try {
    // Extract query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const order_by = req.query.order_by || "desc";

    const { userId } = req.params;
    const { status } = req.query;

    // Calculate the number of documents to skip
    const skip = (page - 1) * size;

    if (!["pending", "approved", "declined"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Fetch applications based on userId and status
    const applications = await Application.find({
      userId,
      status,
      visibility: true,
    })
      .populate("userId organizationApplication")
      .sort({ createdAt: order_by === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(size);

    // Get the total number of applications (for pagination metadata)
    const totalApplications = await Application.countDocuments({
      userId,
      status,
      visibility: true,
    });

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
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getApplicationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const applications = await Application.find({ userId }).populate(
      "userId organizationApplication"
    );

    res.status(200).json({ applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Stats of Providers Applications (FE: Provider Route)
const getApplicationStatsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const applications = await Application.find({ userId });

    // if (!applications || applications.length === 0) {
    //   return res
    //     .status(404)
    //     .json({ message: "No applications found for this user" });
    // }

    const totalApplications = applications.length;
    const approvedApplications = applications.filter(
      (app) => app.status === "approved"
    ).length;
    const pendingApplications = applications.filter(
      (app) => app.status === "pending"
    ).length;

    res.status(200).json({
      totalApplications,
      approvedApplications,
      pendingApplications,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    console.log(applicationId);

    const {
      step1,
      step2,
      step3,
      organizationApplicationId,
      applicationTitle,
      organizationName,
      organizationId,

      // If Files are already in String format (URL)
      medicaidCertificate: medicaidCertificateURLString,
      ECFMGFile: ECFMGFileURLString,
      controlledSubstanceExpirationFile:
        controlledSubstanceExpirationFileURLString,
      deaExpirationFile: deaExpirationFileURLString,
      stateMedicalLicensefile1: stateMedicalLicensefile1URLString,
      stateMedicalLicensefile2: stateMedicalLicensefile2URLString,
      stateMedicalLicensefile3: stateMedicalLicensefile3URLString,
      certificationfile1: certificationfile1URLString,
      certificationfile2: certificationfile2URLString,
      certificationfile3: certificationfile3URLString,
    } = req.body;

    const {
      medicaidCertificate,
      ECFMGFile,
      controlledSubstanceExpirationFile,
      deaExpirationFile,
      stateMedicalLicensefile1,
      stateMedicalLicensefile2,
      stateMedicalLicensefile3,
      certificationfile1,
      certificationfile2,
      certificationfile3,
    } = req.files;

    console.log(req.files, "Files received by multer");
    console.log(req.body, "Parsed body from multer");

    // Parse JSON strings into objects
    const parsedStep1 = JSON.parse(step1);
    const parsedStep2 = JSON.parse(step2);
    const parsedStep3 = JSON.parse(step3);

    const userId = req.user._id;

    // Validate the organizationApplicationId
    if (!mongoose.Types.ObjectId.isValid(organizationApplicationId)) {
      return res
        .status(400)
        .json({ message: "Invalid organization application ID" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const organizationApplication = await OrganizationApplication.findById(
      organizationApplicationId
    ).select("-password");
    if (!organizationApplication) {
      return res
        .status(404)
        .json({ message: "Organization application not found" });
    }

    // Function to upload a file to Cloudinary
    const uploadToCloudinary = async (file) => {
      try {
        if (file && file.buffer) {
          // If the file is a buffer, upload it directly as a buffer
          const result = await new Promise((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  resource_type: "auto",
                  folder: `${userId} files`,
                },
                (error, response) => {
                  if (error) {
                    reject(new Error("Failed to upload file to Cloudinary"));
                  }
                  resolve(response);
                }
              )
              .end(file.buffer);
          });
          console.log("Cloudinary upload success:", result);
          return result.secure_url;
        } else if (file && file.path) {
          const response = await cloudinary.uploader.upload(file.path, {
            resource_type: "auto",
            folder: `${userId} files`,
          });
          console.log("Cloudinary upload success:", response);
          return response.secure_url;
        } else {
          throw new Error("Invalid file format");
        }
      } catch (error) {
        console.error("Error in uploadToCloudinary:", error);
        throw error;
      }
    };

    // Handle files and URL strings for step2.medicalLicenses
    parsedStep2.medicalLicenses.medicaidCertificate =
      medicaidCertificateURLString ||
      (medicaidCertificate
        ? await uploadToCloudinary(medicaidCertificate[0])
        : null);

    parsedStep2.medicalLicenses.ECFMGFile =
      ECFMGFileURLString ||
      (ECFMGFile ? await uploadToCloudinary(ECFMGFile[0]) : null);

    parsedStep2.medicalLicenses.controlledSubstanceExpirationFile =
      controlledSubstanceExpirationFileURLString ||
      (controlledSubstanceExpirationFile
        ? await uploadToCloudinary(controlledSubstanceExpirationFile[0])
        : null);

    parsedStep2.medicalLicenses.deaExpirationFile =
      deaExpirationFileURLString ||
      (deaExpirationFile
        ? await uploadToCloudinary(deaExpirationFile[0])
        : null);

    // Handle files and URL strings for step2.otherMedLicenses
    parsedStep2.otherMedLicenses.stateMedicalLicensefile1 =
      stateMedicalLicensefile1URLString ||
      (stateMedicalLicensefile1
        ? await uploadToCloudinary(stateMedicalLicensefile1[0])
        : null);

    parsedStep2.otherMedLicenses.stateMedicalLicensefile2 =
      stateMedicalLicensefile2URLString ||
      (stateMedicalLicensefile2
        ? await uploadToCloudinary(stateMedicalLicensefile2[0])
        : null);

    parsedStep2.otherMedLicenses.stateMedicalLicensefile3 =
      stateMedicalLicensefile3URLString ||
      (stateMedicalLicensefile3
        ? await uploadToCloudinary(stateMedicalLicensefile3[0])
        : null);

    // Handle files and URL strings for step3.boards
    parsedStep3.boards.certificationfile1 =
      certificationfile1URLString ||
      (certificationfile1
        ? await uploadToCloudinary(certificationfile1[0])
        : null);

    parsedStep3.boards.certificationfile2 =
      certificationfile2URLString ||
      (certificationfile2
        ? await uploadToCloudinary(certificationfile2[0])
        : null);

    parsedStep3.boards.certificationfile3 =
      certificationfile3URLString ||
      (certificationfile3
        ? await uploadToCloudinary(certificationfile3[0])
        : null);

    // Update the application with the new data
    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      {
        applicationTitle,
        organizationName,
        step1: parsedStep1,
        step2: parsedStep2,
        step3: parsedStep3,
        organizationApplication: organizationApplicationId,
        organizationId,
      },
      { new: true }
    );

    if (!updatedApplication) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.status(200).json({
      message: "Application updated successfully",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Error updating application:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find().populate("userId");
    // if (!applications || applications.length === 0) {
    //   return res.status(404).json({ message: "No applications found" });
    // }
    res.status(200).json({ applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;
    if (!["approved", "declined"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      { status },
      { new: true }
    );
    if (!updatedApplication) {
      return res.status(404).json({ message: "Application not found" });
    }
    res.status(200).json({
      message: `Application ${status} successfully`,
      application: updatedApplication,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const deletedApplication = await Application.findByIdAndDelete(
      applicationId
    );
    if (!deletedApplication) {
      return res.status(404).json({ message: "Application not found" });
    }

    await logActivity(
      req.user._id,
      "delete-application",
      "User deleted an application successfully"
    );
    res.status(200).json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const clearAllApplications = async (req, res) => {
  try {
    // Delete all Applications from the database
    const result = await Application.deleteMany({});

    const orgresult = await OrgApplication.deleteMany({});

    // Check if any Applications were deleted
    if (result.deletedCount === 0 && orgresult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No Applications found to delete.",
      });
    }

    res.status(200).json({
      success: true,
      message: "All Applications have been deleted successfully.",
      deletedCount: result.deletedCount + orgresult.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing Applications:", error.message);
    res.status(500).json({
      success: false,
      message: "An error occurred while clearing Applications.",
      error: error.message,
    });
  }
};

module.exports = {
  createApplication,
  getApplicationById,
  getApplicationsByUserId,
  updateApplication,
  deleteApplication,
  getAllApplications,
  updateApplicationStatus,
  getApplicationStatsByUserId,
  getApplicationsByStatusAndUserId,
  getMostRecentApplication,
  clearAllApplications,
};
