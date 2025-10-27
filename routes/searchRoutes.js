const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.get('/', searchController.searchDishes);
router.get('/suggestions', searchController.getSearchSuggestions);
router.get('/trending', searchController.getTrendingSearches);

// Authenticated user routes
router.get('/history', authenticate, searchController.getSearchHistory);
router.delete('/history/:id', authenticate, searchController.clearSearchHistory);

module.exports = router;