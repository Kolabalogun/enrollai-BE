const express = require("express");
const router = express.Router();
const {
  registerOrganization,
  loginOrganization,
  getOrganizationDetails,
  updateOrganizationDetails,
  changeOrganizationPassword,
  getAllOrganizations,
  getOrganizationDetailsByID,
  verifyOrganizationOtp,
  resendOrganizationOtp,
  forgotOrganizationPassword,
  resetOrganizationPassword,
  clearAllOrganizations,
  deleteOrganization,
  clearAllOrganizationsCreatedApplications,
} = require("../controllers/organizationController");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  createApplication,
  getCreatedApplicationsByOrganization,
  deleteOrganizationCreatedApplications,
  getPostedApplicationsForProviders,
  toggleApplicationStatus,
} = require("../controllers/credentialingApplication");
const {
  updateProviderApplication,

  getApplicationsFromProvidersBaseonStatus,
  getApprovedProviders,
  getApplicationStatsForOrganization,
} = require("../controllers/credController");
const {
  authenticateOrganization,
} = require("../controllers/organizationController");
const upload = require("../utils/multer");

// Routes

// Auth
router.post("/register", registerOrganization);
router.post("/login", loginOrganization);
router.post("/verify-otp", verifyOrganizationOtp);
router.get("/resend-otp/:workEmail", resendOrganizationOtp);
router.post("/forgot-password", forgotOrganizationPassword);
router.post("/reset-password", resetOrganizationPassword);

// Applications

// Credentialing Organization Applications

// Create Application for Providers to fill
router.post(
  "/create-application",
  protect,
  authorize("organization"),
  createApplication
);

// Get Applications created for Providers (FE: Organization Route)
router.get(
  "/created-applications",
  protect,
  getCreatedApplicationsByOrganization
);

// Get Applications created by organizations for Providers to fill (FE: Provider Route)
router.get(
  "/get-organization-applications",
  protect,
  getPostedApplicationsForProviders
);

// Toggle the Created Application Status (FE: Organization Route)
router.put(
  "/toggle-organization-application-status/:id",
  protect,
  toggleApplicationStatus
);

// Delete Applications created by organizations for Providers
router.delete(
  "/delete/:id",
  authenticateOrganization,
  deleteOrganizationCreatedApplications
);

// Applications

// Get All Returned Filled Applications Based On Their Status (FE: Organization Route)
router.get("/applications", getApplicationsFromProvidersBaseonStatus);

// Get Stats of Providers Applications in Organizations Dashboard  (FE: Organization Route)
router.get(
  "/:organizationId/application-stats",
  getApplicationStatsForOrganization
);

// Update (Providers) Filled Applications Based On The Status Passed (FE: Organization Route)
router.put("/update-application/:applicationId", updateProviderApplication);

// Providers
// Get Applications of Providers which their Applications have been Approved (FE: Organization Route)
router.get("/get-providers/:organizationId", getApprovedProviders);

// Profile

// Update Organization Profile
router.put(
  "/update",
  authenticateOrganization,
  upload.single("profilePicture"),
  updateOrganizationDetails
);

// Change Organization Profile Password
router.put(
  "/change-password",
  authenticateOrganization,
  changeOrganizationPassword
);

// Delete Organization Account
router.delete("/delete", authenticateOrganization, deleteOrganization);

//

router.get("/getApplications/all", protect, getAllOrganizations);
router.get("/details", authenticateOrganization, getOrganizationDetails);
router.get(
  "/details/:id",
  authenticateOrganization,
  getOrganizationDetailsByID
);

router.delete(
  "/delete/all/",
  // protect,
  // authorize("organization"),
  clearAllOrganizations
);

router.delete(
  "/delete/all/created-applications",
  // protect,
  // authorize("organization"),
  clearAllOrganizationsCreatedApplications
);

module.exports = router;
