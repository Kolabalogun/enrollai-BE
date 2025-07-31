const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAllProviders,
  createSuperAdmin,
  getApplicationStats,
  getAllOrganizations,
  getAllApplicationsBasedOnStatus,
  getAllAdmins,
  deleteAdminAccount,
  changeAccountStatus,
  deleteProviderOrOrganization,
} = require("../controllers/adminController");
const { updateProfile } = require("../controllers/authcontroller");

// Create a new admin account (FE: Admin Route)
router.post("/create", createSuperAdmin);

// Applications

//  Get (All, Imcoming, Declined & Approved) Applications from Providers Based on their Status (FE: Admin Route)
router.get(
  "/applications/all",
  protect,
  authorize("super_admin"),
  getAllApplicationsBasedOnStatus
);

// Get Stats Applications in Admin Dashboard (FE: Admin Route)
router.get(
  "/application-stats",
  protect,
  authorize("super_admin"),
  getApplicationStats
);

// Users

// Get All Admin Users   (FE: Admin Route)
router.get("/all", protect, authorize("super_admin"), getAllAdmins);
// Get All Providers Users   (FE: Admin Route)
router.get("/providers", protect, authorize("super_admin"), getAllProviders);
// Get All Organizations Users   (FE: Admin Route)
router.get(
  "/credentialing-organizations",
  protect,
  authorize("super_admin"),
  getAllOrganizations
);

// Change Status of a Provider or Organization Account (FE: Admin Route)
router.put(
  "/change-account-status",
  protect,
  authorize("super_admin"),
  changeAccountStatus
);

// Delete Provider Or Organization Account Along side all thier Applications  (FE: Admin Route)
router.delete(
  "/delete-provider-or-organization",
  protect,
  authorize("super_admin"),
  deleteProviderOrOrganization
);

// Update Admin Profile (FE: Admin Route)
router.put("/update/profile", protect, authorize("super_admin"), updateProfile);

// Delete Admin Account (FE: Admin Route)
router.delete("/delete", protect, authorize("super_admin"), deleteAdminAccount);

module.exports = router;
