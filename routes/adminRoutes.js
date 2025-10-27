const express = require('express');
const router = express.Router();
const scrapingController = require('../controllers/scrapingController');
const { authenticate, authorize } = require('../middleware/auth');

// Scraping management routes (admin only)
router.post('/scrape/trigger', 
  authenticate, 
  authorize('admin'), 
  scrapingController.triggerScraping
);

router.get('/scrape/status', 
  authenticate, 
  authorize('admin'), 
  scrapingController.getScrapingStatus
);

router.get('/scrape/stats', 
  authenticate, 
  authorize('admin'), 
  scrapingController.getScrapingStats
);

// Public scraping status (read-only)
router.get('/scrape/public-status', scrapingController.getPublicStatus);

module.exports = router;