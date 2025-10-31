// ==================== aiRecommendationService.js ====================
// Free AI recommendations using Groq API (mixtral-8x7b model)

const axios = require('axios');
const { Dish, User } = require('../models');

class AIRecommendationService {
  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqBaseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    if (!this.groqApiKey) {
      console.warn('⚠️  GROQ_API_KEY not set - AI recommendations disabled');
    }
  }

  // ============== Get User Preferences ==============
  async getUserPreferences(userId) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      let preferences = {};
      
      if (user.preferences && typeof user.preferences === 'string') {
        try {
          preferences = JSON.parse(user.preferences);
        } catch (e) {
          preferences = {};
        }
      }

      return {
        name: user.name,
        location: user.location || 'Mumbai',
        email: user.email,
        preferences: preferences,
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        cuisinePreferences: preferences.cuisinePreferences || [],
        priceRange: preferences.priceRange || { min: 50, max: 500 },
        budget: preferences.budget || 300
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw error;
    }
  }

  // ============== Get Available Dishes ==============
  async getAvailableDishes(location, limit = 50) {
    try {
      const dishes = await Dish.findAll({
        where: {
          location: location,
          availability: true
        },
        limit: limit,
        order: [['rating', 'DESC']],
        raw: true
      });

      return dishes;
    } catch (error) {
      console.error('Error fetching dishes:', error);
      return [];
    }
  }

  // ============== Generate AI Recommendations ==============
  async generateRecommendations(userId, location = 'Mumbai', limit = 10) {
    try {
      console.log(`🤖 Generating AI recommendations for user ${userId}...`);

      // Get user preferences
      const userPreferences = await this.getUserPreferences(userId);
      
      // Get available dishes
      const availableDishes = await this.getAvailableDishes(location, 100);

      if (availableDishes.length === 0) {
        console.log('No dishes available for recommendations');
        return { 
          recommendations: [], 
          reason: 'No dishes available in selected location'
        };
      }

      // Filter by price range
      const filteredDishes = availableDishes.filter(
        dish => dish.price >= userPreferences.priceRange.min && 
                dish.price <= userPreferences.priceRange.max
      );

      // Build prompt for Groq AI
      const prompt = this.buildRecommendationPrompt(userPreferences, filteredDishes, limit);

      // Call Groq API
      const recommendations = await this.callGroqAPI(prompt);

      console.log(`✅ Generated ${recommendations.length} recommendations`);
      
      return {
        recommendations: recommendations,
        userPreferences: userPreferences,
        totalAvailable: availableDishes.length
      };

    } catch (error) {
      console.error('❌ Error generating recommendations:', error.message);
      
      // Fallback to rule-based recommendations
      console.log('⚠️  Falling back to rule-based recommendations...');
      return await this.getFallbackRecommendations(userId, location, limit);
    }
  }

  // ============== Build Recommendation Prompt ==============
  buildRecommendationPrompt(userPreferences, dishes, limit) {
    const dishSummary = dishes.slice(0, 30).map(dish => 
      `${dish.name} - $${dish.price} (Rating: ${dish.rating}/5, Cuisine: ${dish.cuisine})`
    ).join('\n');

    return `You are a food recommendation expert. Based on the user's preferences, recommend the TOP ${limit} BEST dishes from the list below.

USER PROFILE:
- Name: ${userPreferences.name}
- Location: ${userPreferences.location}
- Budget: $${userPreferences.budget}
- Dietary Restrictions: ${userPreferences.dietaryRestrictions.join(', ') || 'None'}
- Cuisine Preferences: ${userPreferences.cuisinePreferences.join(', ') || 'Any'}
- Price Range: $${userPreferences.priceRange.min} - $${userPreferences.priceRange.max}

AVAILABLE DISHES:
${dishSummary}

Please provide recommendations in JSON format ONLY with this structure:
{
  "recommendations": [
    {
      "name": "dish name",
      "reason": "why this dish matches user preferences",
      "matchScore": 0.95
    }
  ]
}

Focus on:
1. Matching dietary restrictions
2. Matching cuisine preferences
3. Best value for money
4. High ratings
5. Within budget

IMPORTANT: Return ONLY valid JSON, no other text.`;
  }

  // ============== Call Groq API ==============
  async callGroqAPI(prompt) {
    if (!this.groqApiKey) {
      throw new Error('Groq API key not configured');
    }

    try {
      const response = await axios.post(
        this.groqBaseUrl,
        {
          model: 'mixtral-8x7b-32768',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      
      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON in AI response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      return parsedResponse.recommendations || [];

    } catch (error) {
      console.error('Groq API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============== Fallback Rule-Based Recommendations ==============
  async getFallbackRecommendations(userId, location, limit = 10) {
    try {
      const userPreferences = await this.getUserPreferences(userId);
      const dishes = await this.getAvailableDishes(location, limit * 3);

      // Score dishes based on preferences
      const scoredDishes = dishes.map(dish => {
        let score = 0;

        // Rating score (0-1)
        score += (dish.rating / 5) * 0.3;

        // Price value score (0-1)
        const priceScore = Math.max(0, 1 - (dish.price / userPreferences.budget));
        score += priceScore * 0.4;

        // Discount score
        score += (dish.discount_percent / 100) * 0.2;

        // Cuisine match
        if (userPreferences.cuisinePreferences.length > 0 && 
            userPreferences.cuisinePreferences.includes(dish.cuisine)) {
          score += 0.1;
        }

        return {
          name: dish.name,
          price: dish.price,
          rating: dish.rating,
          cuisine: dish.cuisine,
          discount_percent: dish.discount_percent,
          restaurant_store_name: dish.restaurant_store_name,
          platform: dish.platform,
          score: score,
          reason: this.generateReason(dish, score)
        };
      });

      // Sort by score and return top recommendations
      const recommendations = scoredDishes
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(r => ({
          name: r.name,
          reason: r.reason,
          matchScore: Math.min(r.score, 1).toFixed(2),
          details: {
            price: r.price,
            rating: r.rating,
            cuisine: r.cuisine,
            discount: r.discount_percent,
            restaurant: r.restaurant_store_name,
            platform: r.platform
          }
        }));

      return {
        recommendations: recommendations,
        userPreferences: userPreferences,
        method: 'rule-based'
      };

    } catch (error) {
      console.error('Fallback recommendation error:', error);
      return { recommendations: [], error: error.message };
    }
  }

  // ============== Generate Reason Text ==============
  generateReason(dish, score) {
    const reasons = [];

    if (dish.rating >= 4.5) {
      reasons.push('Highly rated');
    } else if (dish.rating >= 4.0) {
      reasons.push('Well rated');
    }

    if (dish.discount_percent >= 20) {
      reasons.push(`${dish.discount_percent}% discount`);
    }

    if (score >= 0.8) {
      reasons.push('Great value');
    }

    if (reasons.length === 0) {
      reasons.push('Recommended for you');
    }

    return reasons.join(' • ');
  }

  // ============== Save Recommendation Feedback ==============
  async saveRecommendationFeedback(userId, dishName, liked) {
    try {
      let user = await User.findByPk(userId);
      
      let preferences = {};
      if (user.preferences && typeof user.preferences === 'string') {
        try {
          preferences = JSON.parse(user.preferences);
        } catch (e) {
          preferences = {};
        }
      }

      if (!preferences.recommendationFeedback) {
        preferences.recommendationFeedback = [];
      }

      preferences.recommendationFeedback.push({
        dishName: dishName,
        liked: liked,
        timestamp: new Date().toISOString()
      });

      // Keep only last 50 feedbacks
      if (preferences.recommendationFeedback.length > 50) {
        preferences.recommendationFeedback = preferences.recommendationFeedback.slice(-50);
      }

      await user.update({
        preferences: JSON.stringify(preferences)
      });

      return { success: true, message: 'Feedback saved' };

    } catch (error) {
      console.error('Error saving feedback:', error);
      throw error;
    }
  }

  // ============== Get Trending Recommendations ==============
  async getTrendingRecommendations(location, limit = 10) {
    try {
      const topRatedDishes = await Dish.findAll({
        where: {
          location: location,
          availability: true,
          rating: { [require('sequelize').Op.gte]: 4.0 }
        },
        order: [['rating', 'DESC'], ['review_count', 'DESC']],
        limit: limit,
        raw: true
      });

      return {
        trending: topRatedDishes.map(dish => ({
          name: dish.name,
          reason: `${dish.rating}★ rating • ${dish.review_count} reviews`,
          matchScore: '0.98',
          details: {
            price: dish.price,
            rating: dish.rating,
            cuisine: dish.cuisine,
            platform: dish.platform
          }
        }))
      };

    } catch (error) {
      console.error('Error getting trending:', error);
      return { trending: [] };
    }
  }
}

module.exports = new AIRecommendationService();