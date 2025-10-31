// ==================== scrapingService.js ====================
// Real-world alternatives to web scraping for learning projects

const axios = require('axios');
const { Dish, PriceHistory } = require('../models');
const { Op } = require('sequelize');

class ScrapingService {
  constructor() {
    this.apiSources = {
      spoonacular: process.env.SPOONACULAR_API_KEY, // Free tier: 150 requests/day
      edamam: {
        app_id: process.env.EDAMAM_APP_ID,
        app_key: process.env.EDAMAM_APP_KEY
      },
      mock: true // Fallback to enhanced mock data
    };
  }

  // ============== REAL API: Spoonacular (Recommended) ==============
  async scrapeFromSpoonacular(location = 'Mumbai') {
    const scrapedItems = [];
    
    try {
      console.log(`🥘 Fetching from Spoonacular API for ${location}...`);
      
      // Get random recipes
      const response = await axios.get(
        'https://api.spoonacular.com/recipes/random',
        {
          params: {
            apiKey: this.apiSources.spoonacular,
            number: 20,
            tags: 'breakfast,lunch,dinner'
          }
        }
      );

      for (const recipe of response.data.recipes) {
        // Estimate price based on servings and ingredients
        const estimatedPrice = this.estimatePrice(recipe.servings, recipe.extendedIngredients?.length || 0);
        
        scrapedItems.push({
          name: recipe.title,
          platform: 'api_spoonacular',
          price: estimatedPrice,
          original_price: estimatedPrice * 1.2,
          discount_percent: 17,
          rating: 4.0 + (Math.random() * 1.0),
          restaurant_store_name: 'Spoonacular Recipe',
          category: 'food',
          cuisine: this.detectCuisineFromRecipe(recipe),
          location: location,
          platform_url: recipe.sourceUrl,
          description: recipe.summary?.substring(0, 200) || `Delicious ${recipe.title}`,
          image_url: recipe.image,
          dietary_info: JSON.stringify({
            vegetarian: recipe.vegetarian,
            vegan: recipe.vegan,
            glutenFree: recipe.glutenFree,
            dairyFree: recipe.dairyFree,
            servings: recipe.servings,
            prepTime: recipe.preparationMinutes,
            cookTime: recipe.cookingMinutes
          })
        });
      }

      console.log(`✅ Spoonacular: ${scrapedItems.length} items fetched`);
      return scrapedItems;

    } catch (error) {
      console.error('❌ Spoonacular API failed:', error.message);
      return [];
    }
  }

  // ============== REAL API: Edamam (Nutritional Data) ==============
  async scrapeFromEdamam(location = 'Mumbai') {
    const scrapedItems = [];
    
    try {
      console.log(`🥗 Fetching from Edamam API for ${location}...`);
      
      const cuisines = ['Indian', 'Italian', 'Chinese', 'Mexican', 'American'];
      const dishTypes = ['lunch', 'dinner', 'snack'];
      
      for (const cuisine of cuisines.slice(0, 2)) { // Limit to stay within free tier
        for (const dishType of dishTypes.slice(0, 1)) {
          try {
            const response = await axios.get(
              'https://api.edamam.com/search',
              {
                params: {
                  type: 'public',
                  q: `${cuisine} ${dishType}`,
                  app_id: this.apiSources.edamam.app_id,
                  app_key: this.apiSources.edamam.app_key,
                  to: 10
                }
              }
            );

            for (const hit of response.data.hits.slice(0, 5)) {
              const recipe = hit.recipe;
              const estimatedPrice = this.estimatePrice(recipe.yield, recipe.ingredientLines?.length || 0);

              scrapedItems.push({
                name: recipe.label,
                platform: 'api_edamam',
                price: estimatedPrice,
                original_price: estimatedPrice * 1.15,
                discount_percent: 12,
                rating: 4.1 + (Math.random() * 0.9),
                restaurant_store_name: 'Edamam Recipe',
                category: 'food',
                cuisine: cuisine,
                location: location,
                platform_url: recipe.url,
                description: `Nutritious ${recipe.label} with ${recipe.ingredientLines?.length || 0} ingredients`,
                image_url: recipe.image,
                dietary_info: JSON.stringify({
                  calories: Math.round(recipe.calories / recipe.yield),
                  protein: recipe.totalNutrients.PROCNT?.quantity?.toFixed(1) || 'N/A',
                  carbs: recipe.totalNutrients.CHOCDF?.quantity?.toFixed(1) || 'N/A',
                  fat: recipe.totalNutrients.FAT?.quantity?.toFixed(1) || 'N/A',
                  healthLabels: recipe.healthLabels?.slice(0, 5) || []
                })
              });
            }

            // Rate limiting
            await this.delay(1000);

          } catch (err) {
            console.log(`⚠️ Error fetching ${cuisine}:`, err.message);
          }
        }
      }

      console.log(`✅ Edamam: ${scrapedItems.length} items fetched`);
      return scrapedItems;

    } catch (error) {
      console.error('❌ Edamam API failed:', error.message);
      return [];
    }
  }

  // ============== MOCK DATA (Fallback) ==============
  async generateMockData(location = 'Mumbai') {
    const scrapedItems = [];
    
    const mockDishes = [
      { name: 'Butter Chicken', cuisine: 'Indian', basePrice: 320, platform: 'mock_swiggy' },
      { name: 'Margherita Pizza', cuisine: 'Italian', basePrice: 299, platform: 'mock_swiggy' },
      { name: 'Chicken Fried Rice', cuisine: 'Chinese', basePrice: 180, platform: 'mock_swiggy' },
      { name: 'Paneer Tikka Masala', cuisine: 'Indian', basePrice: 280, platform: 'mock_zomato' },
      { name: 'Caesar Salad', cuisine: 'Italian', basePrice: 220, platform: 'mock_zomato' },
      { name: 'Amul Milk 1L', cuisine: null, basePrice: 55, platform: 'mock_blinkit', category: 'grocery' },
      { name: 'Basmati Rice 1kg', cuisine: null, basePrice: 85, platform: 'mock_blinkit', category: 'grocery' },
      { name: 'Fresh Eggs Pack', cuisine: null, basePrice: 45, platform: 'mock_instamart', category: 'grocery' }
    ];

    for (const dish of mockDishes) {
      const discount = Math.floor(Math.random() * 25) + 10;
      const originalPrice = dish.basePrice * (1 + discount / 100);

      scrapedItems.push({
        name: dish.name,
        platform: dish.platform,
        price: dish.basePrice,
        original_price: originalPrice,
        discount_percent: discount,
        rating: 4.0 + (Math.random() * 1.0),
        restaurant_store_name: dish.platform.split('_')[1].charAt(0).toUpperCase() + dish.platform.split('_')[1].slice(1),
        category: dish.category || 'food',
        cuisine: dish.cuisine || 'multi-cuisine',
        location: location,
        platform_url: `https://${dish.platform.split('_')[1]}.com`,
        description: `${dish.name} - Great value for money`,
        image_url: null,
        dietary_info: JSON.stringify({})
      });
    }

    console.log(`✅ Mock Data: ${scrapedItems.length} items generated`);
    return scrapedItems;
  }

  // ============== MAIN SCRAPING ORCHESTRATOR ==============
  async scrapeAllPlatforms(location = 'Mumbai') {
    console.log(`🔄 Starting scraping cycle for ${location} at ${new Date().toISOString()}`);
    
    const results = {
      totalScraped: 0,
      platformResults: {},
      errors: []
    };

    try {
      // Try Spoonacular first (best for food data)
      if (this.apiSources.spoonacular) {
        try {
          const spoonacularItems = await this.scrapeFromSpoonacular(location);
          results.platformResults.spoonacular = spoonacularItems;
          results.totalScraped += spoonacularItems.length;
          await this.saveScrapedItems(spoonacularItems);
        } catch (error) {
          results.errors.push({ platform: 'spoonacular', error: error.message });
        }
      }

      // Try Edamam (nutritional data)
      if (this.apiSources.edamam.app_id && this.apiSources.edamam.app_key) {
        try {
          const edamamItems = await this.scrapeFromEdamam(location);
          results.platformResults.edamam = edamamItems;
          results.totalScraped += edamamItems.length;
          await this.saveScrapedItems(edamamItems);
        } catch (error) {
          results.errors.push({ platform: 'edamam', error: error.message });
        }
      }

      // If results are low, add mock data
      if (results.totalScraped < 10) {
        console.log('⚠️ Low API results, adding mock data...');
        const mockItems = await this.generateMockData(location);
        results.platformResults.mock = mockItems;
        results.totalScraped += mockItems.length;
        await this.saveScrapedItems(mockItems);
      }

      console.log(`🎉 Scraping completed: ${results.totalScraped} total items`);
      return results;

    } catch (error) {
      console.error('💥 Scraping cycle failed:', error);
      throw error;
    }
  }

  // ============== HELPERS ==============
  estimatePrice(servings = 2, ingredientCount = 5) {
    const basePrice = 100;
    const pricePerServing = 80;
    const pricePerIngredient = 15;
    
    return Math.round(basePrice + (servings * pricePerServing) + (ingredientCount * pricePerIngredient));
  }

  detectCuisineFromRecipe(recipe) {
    const cuisines = {
      indian: ['curry', 'tandoori', 'biryani', 'tikka', 'paneer', 'naan'],
      italian: ['pasta', 'pizza', 'risotto', 'lasagna'],
      chinese: ['noodles', 'soy', 'wok', 'fried rice'],
      mexican: ['taco', 'burrito', 'quesadilla'],
      american: ['burger', 'sandwich', 'bbq']
    };

    const title = recipe.title?.toLowerCase() || '';
    
    for (const [cuisine, keywords] of Object.entries(cuisines)) {
      if (keywords.some(k => title.includes(k))) {
        return cuisine;
      }
    }
    return 'multi-cuisine';
  }

  async saveScrapedItems(items) {
    let savedCount = 0;
    
    for (const itemData of items) {
      try {
        const [dish, created] = await Dish.findOrCreate({
          where: {
            name: itemData.name,
            platform: itemData.platform,
            location: itemData.location
          },
          defaults: itemData
        });

        if (!created) {
          await dish.update({
            price: itemData.price,
            original_price: itemData.original_price,
            discount_percent: itemData.discount_percent,
            rating: itemData.rating,
            availability: true,
            updated_at: new Date()
          });
        }

        await PriceHistory.create({
          dish_id: dish.id,
          price: itemData.price,
          original_price: itemData.original_price,
          discount_percent: itemData.discount_percent,
          availability: true
        });

        savedCount++;
      } catch (error) {
        console.error('Error saving item:', error.message);
      }
    }

    console.log(`💾 Saved ${savedCount} items to database`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async triggerManualScrape(location = 'Mumbai') {
    return await this.scrapeAllPlatforms(location);
  }
}

module.exports = new ScrapingService();