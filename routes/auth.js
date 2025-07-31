const express = require("express");
const router = express.Router();
const authController = require("../controllers/authcontroller");
const { protect } = require("../middleware/authMiddleware");

// Routes

//Auth
router.post("/register", authController.register);
router.post("/verify-otp", authController.verifyOtp);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/resend-otp/:email", authController.resendOtp);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

// Get User (Provider) Information
router.get("/users", authController.getUserDetails);

// Update User (Provider) Profile
router.put("/update-profile", protect, authController.updateProfile);

router.put("/change-password", protect, authController.changePassword);

// Delete User (Provider) Account
router.delete("/delete", protect, authController.deleteUserAccount);

// Delete All Users (Providers) Account
router.delete(
  "/delete/all",
  //  protect,
  authController.clearAllUsers
);

module.exports = router;
