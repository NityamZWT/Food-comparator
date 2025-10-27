const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const dishRoutes = require('./dishRoutes');
const searchRoutes = require('./searchRoutes');
const adminRoutes = require('./adminRoutes');

router.use('/auth', authRoutes);
router.use('/dishes', dishRoutes);
router.use('/search', searchRoutes);
router.use('/admin', adminRoutes);

module.exports = router;