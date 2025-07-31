const express = require('express');
const router = express.Router();
const { createActivityLog, getRecentActivities, getUserRecentActivities, getAllActivities } = require('../controllers/activityController');
const { protect, authorize } = require('../middleware/authMiddleware'); 

router.post('/log', protect, async (req, res) => {
  const { actionType, actionDetails } = req.body;
  const userId = req.user.id;
  try {
    await createActivityLog(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Error logging activity', error });
  }
});

router.get('/recent', protect, async (req, res) => {
  try {
    await getRecentActivities(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activities', error });
  }
});

router.get('/userrecent', protect, async (req, res) => {
    try {
      await getUserRecentActivities(req, res);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching activities', error });
    }
  });

router.get('/all', protect, async (req, res) => {
  try {
    await getAllActivities(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activities', error });
  }
});

module.exports = router;
