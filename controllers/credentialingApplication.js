const OrgApplication = require("../models/credentialingApplication");
const Application = require("../models/applicationModel");

const { logActivity } = require("../controllers/activityController");

//  Create Application (FE: Organization Route)
const createApplication = async (req, res) => {
  try {
    const { applicationName, applicationTitle } = req.body;
    if (!applicationName || !applicationTitle) {
      return res
        .status(400)
        .json({ message: "Application name and title are required" });
    }
    const organizationId = req.user._id;
    const application = new OrgApplication({
      organization: organizationId,

      applicationName,
      applicationTitle,
    });

    await application.save();
    res.status(201).json({
      message: "Application created successfully",
      application,
    });
    await logActivity(
      req.user._id,
      "createapplication",
      "Application created successfully"
    );
  } catch (error) {
    console.error("Error creating application:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Applications created for Providers (FE: Organization Route)
const getCreatedApplicationsByOrganization = async (req, res) => {
  try {
    // Extract query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 5;
    const order_by = req.query.order_by || "desc";

    // Calculate the number of documents to skip
    const skip = (page - 1) * size;

    const organizationId = req.user._id;

    const applications = await OrgApplication.find({
      organization: organizationId,
    })
      .populate(
        "organization",
        "organizationName administratorFullName workEmail"
      )
      .sort({ createdAt: order_by === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(size);

    // Get the total number of applications (for pagination metadata)
    const totalApplications = await OrgApplication.countDocuments({
      organization: organizationId,
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
    console.error(
      "Error fetching applications for organization:",
      error.message
    );
    res.status(500).json({ message: "Server error" });
  }
};

// Get Applications created by organizations for Providers to fill (FE: Provider Route)
const getPostedApplicationsForProviders = async (req, res) => {
  try {
    // Extract query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 5;
    const order_by = req.query.order_by || "desc";

    // Calculate the number of documents to skip
    const skip = (page - 1) * size;

    // Fetch applications with pagination , sorting  and if application is active
    const applications = await OrgApplication.find({ status: true })
      .populate(
        "organization",
        "organizationName administratorFullName workEmail"
      )
      .sort({ createdAt: order_by === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(size);

    // Get the total number of applications (for pagination metadata)
    const totalApplications = await OrgApplication.countDocuments({
      status: true,
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
    console.error("Error fetching applications:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Toggle the Created Application Status (FE: Organization Route)
const toggleApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    //  Find the application by ID
    const application = await OrgApplication.findById(id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    //  Toggle the status
    application.status = !application.status;

    //  Save the updated application
    await application.save();

    //   Log the activity
    await logActivity(
      req.user._id,
      "toggle-application-status",
      `Application status toggled to ${application.status}`
    );

    //  Return the updated application
    res.status(200).json({
      message: "Application status toggled successfully",
      application,
    });
  } catch (error) {
    console.error("Error toggling application status:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Created Application (FE: Organization Route)
const deleteOrganizationCreatedApplications = async (req, res) => {
  try {
    const { id } = req.params;

    //  Find the organization's created application
    const application = await OrgApplication.findById(id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Check if the organization is authorized to delete the application
    const organizationId = req.organizationId;
    if (application.organization.toString() !== organizationId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to delete this application",
      });
    }

    //  Extract details for deleting provider applications
    const {
      organization: orgId,
      _id: organizationApplicationId,
      applicationTitle,
      applicationName,
    } = application;

    // Delete the organization's created application
    await OrgApplication.findByIdAndDelete(id);

    //   Delete all provider applications with the same orgId, orgName, and applicationTitle
    await Application.deleteMany({
      organizationId: orgId,
      organizationApplication: organizationApplicationId,
      applicationTitle,
      applicationType: applicationName,
    });

    // Step 6: Log the activity
    await logActivity(
      req.organizationId,
      "delete-application",
      "Application deleted successfully"
    );

    // Step 7: Return success response
    res.status(200).json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error("Error deleting application:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createApplication,
  getPostedApplicationsForProviders,
  getCreatedApplicationsByOrganization,
  deleteOrganizationCreatedApplications,
  toggleApplicationStatus,
};
