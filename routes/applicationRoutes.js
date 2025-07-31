const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/applicationController");
const { protect, authorize } = require("../middleware/authMiddleware");
const multer = require("multer");

// Configure multer for file uploads

const upload = multer({}).fields([
  { name: "medicaidCertificate", maxCount: 1 },
  { name: "ECFMGFile", maxCount: 1 },
  { name: "controlledSubstanceExpirationFile", maxCount: 1 },
  { name: "deaExpirationFile", maxCount: 1 },
  { name: "stateMedicalLicensefile1", maxCount: 1 },
  { name: "stateMedicalLicensefile2", maxCount: 1 },
  { name: "stateMedicalLicensefile3", maxCount: 1 },
  { name: "certificationfile1", maxCount: 1 },
  { name: "certificationfile2", maxCount: 1 },
  { name: "certificationfile3", maxCount: 1 },
]);

// Apply multer middleware to the route

// Create Application (FE: Provider Route)
router.post("/apply", upload, protect, applicationController.createApplication);

// Update Application (FE: Provider Route)
router.put(
  "/:applicationId",
  upload,
  protect,
  applicationController.updateApplication
);

router.get(
  "/:applicationId",
  protect,
  applicationController.getApplicationById
);

router.get(
  "/getrecentapplication/:userId",
  protect,
  applicationController.getMostRecentApplication
);

router.get(
  "/user/status/:userId",
  protect,
  applicationController.getApplicationsByStatusAndUserId
);
router.get(
  "/user/:userId",
  protect,
  applicationController.getApplicationsByUserId
);
router.get(
  "/user-stat/:userId",
  protect,
  applicationController.getApplicationStatsByUserId
);

router.delete(
  "/:applicationId",
  protect,
  applicationController.deleteApplication
);
router.get(
  "/credentialing",
  protect,
  authorize("organization"),
  applicationController.getAllApplications
);
router.put(
  "/status/:applicationId",
  protect,
  authorize("organization"),
  applicationController.updateApplicationStatus
);

router.delete(
  "/delete/all",
  // protect,
  applicationController.clearAllApplications
);

module.exports = router;
