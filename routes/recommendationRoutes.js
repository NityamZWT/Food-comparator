const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticate } = require('../middleware/auth');

// Protected routes - require authentication
router.use(authenticate);

// Get personalized AI recommendations
router.get('/personalized', recommendationController.getRecommendations);

// Get meal-type specific suggestions
router.get('/suggestions', recommendationController.getPersonalizedSuggestions);

// Get trending recommendations (public but authenticated)
router.get('/trending', recommendationController.getTrendingRecommendations);

// Save feedback on recommendations
router.post('/feedback', recommendationController.saveFeedback);

// Update user preferences for better recommendations
router.put('/preferences', recommendationController.updateUserPreferences);

module.exports = router;