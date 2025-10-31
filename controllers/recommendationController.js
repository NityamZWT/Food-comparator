const aiRecommendationService = require('../services/aiRecommendationService');
const response = require('../utils/response');

exports.getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { location = 'Mumbai', limit = 10 } = req.query;
    
    console.log(`📊 Fetching recommendations for user ${userId} in ${location}`);

    const result = await aiRecommendationService.generateRecommendations(
      userId,
      location,
      parseInt(limit)
    );

    response.success(res, 'AI Recommendations generated successfully', result);

  } catch (error) {
    console.error('Error in getRecommendations:', error);
    next(error);
  }
};

exports.getTrendingRecommendations = async (req, res, next) => {
  try {
    const { location = 'Mumbai', limit = 10 } = req.query;

    const result = await aiRecommendationService.getTrendingRecommendations(
      location,
      parseInt(limit)
    );

    response.success(res, 'Trending recommendations retrieved', result);

  } catch (error) {
    next(error);
  }
};

exports.saveFeedback = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { dishName, liked } = req.body;

    if (!dishName || typeof liked !== 'boolean') {
      return response.error(res, 'Invalid feedback data', 400);
    }

    const result = await aiRecommendationService.saveRecommendationFeedback(
      userId,
      dishName,
      liked
    );

    response.success(res, 'Feedback saved successfully', result);

  } catch (error) {
    next(error);
  }
};

exports.getPersonalizedSuggestions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { location = 'Mumbai', mealType = 'lunch' } = req.query;

    // Get base recommendations
    const baseRecs = await aiRecommendationService.generateRecommendations(userId, location, 15);
    
    // Filter by meal type if specified
    let filtered = baseRecs.recommendations;
    if (mealType === 'breakfast') {
      filtered = filtered.filter(r => !r.name.toLowerCase().includes('heavy'));
    } else if (mealType === 'dinner') {
      filtered = filtered.filter(r => !r.name.toLowerCase().includes('light'));
    }

    response.success(res, `Personalized ${mealType} suggestions`, {
      mealType,
      recommendations: filtered.slice(0, 10),
      userPreferences: baseRecs.userPreferences
    });

  } catch (error) {
    next(error);
  }
};

exports.updateUserPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cuisinePreferences, dietaryRestrictions, priceRange, budget } = req.body;
    
    const { User } = require('../models');
    const user = await User.findByPk(userId);

    if (!user) {
      return response.error(res, 'User not found', 404);
    }

    let preferences = {};
    if (user.preferences && typeof user.preferences === 'string') {
      try {
        preferences = JSON.parse(user.preferences);
      } catch (e) {
        preferences = {};
      }
    }

    // Update preferences
    if (cuisinePreferences) preferences.cuisinePreferences = cuisinePreferences;
    if (dietaryRestrictions) preferences.dietaryRestrictions = dietaryRestrictions;
    if (priceRange) preferences.priceRange = priceRange;
    if (budget) preferences.budget = budget;

    await user.update({
      preferences: JSON.stringify(preferences)
    });

    response.success(res, 'Preferences updated successfully', {
      preferences: preferences
    });

  } catch (error) {
    next(error);
  }
};