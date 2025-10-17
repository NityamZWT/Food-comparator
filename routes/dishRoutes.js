const express = require('express');
const router = express.Router();
const dishController = require('../controllers/dishController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('admin'), dishController.addDish);
router.get('/', authenticate, dishController.getDishes);
router.get('/scrape', authenticate, dishController.scrapeDishes);

module.exports = router;
