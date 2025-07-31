const express = require('express');
const router = express.Router();
const caqhauthController = require('../controllers/caqhauthController');

router.post('/link-caqh', caqhauthController.linkCaqhAccount);

router.post('/login-caqh', caqhauthController.caqhLogin);

module.exports = router;
