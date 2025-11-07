// ...existing code...
const axios = require("axios");
const { Dish, PriceHistory, sequelize } = require("../models");

class ScrapingService {
  constructor() {
    this.apiKeys = {
      spoonacular: process.env.SPOONACULAR_API_KEY,
      edamamAppId: process.env.EDAMAM_APP_ID,
      edamamAppKey: process.env.EDAMAM_APP_KEY,
    };
    this.minItemsBeforeMock = 10;
  }

  async scrapeFromSpoonacular(location = "Mumbai") {
    const scrapedItems = [];
    if (!this.apiKeys.spoonacular) return scrapedItems;

    try {
      const res = await axios.get(
        "https://api.spoonacular.com/recipes/random",
        {
          params: {
            apiKey: this.apiKeys.spoonacular,
            number: 20,
            tags: "breakfast,lunch,dinner",
          },
          timeout: 15000,
        }
      );

      for (const recipe of res.data.recipes || []) {
        const estimatedPrice = this.estimatePrice(
          recipe.servings,
          recipe.extendedIngredients?.length || 0
        );
        scrapedItems.push({
          name: recipe.title,
          platform: "spoonacular",
          price: estimatedPrice,
          original_price: Math.round(estimatedPrice * 1.2),
          discount_percent: 15,
          rating: 4.0 + Math.random() * 1.0,
          restaurant_store_name: "Spoonacular",
          category: "food",
          cuisine: this.detectCuisineFromRecipe(recipe),
          location,
          platform_url: recipe.sourceUrl,
          description: (recipe.summary || "")
            .replace(/<[^>]+>/g, "")
            .slice(0, 300),
          image_url: recipe.image || null,
          dietary_info: JSON.stringify({
            vegetarian: !!recipe.vegetarian,
            vegan: !!recipe.vegan,
            glutenFree: !!recipe.glutenFree,
            servings: recipe.servings,
          }),
        });
      }
    } catch (err) {
      console.error("Spoonacular error:", err.message);
    }
    return scrapedItems;
  }

  // ...existing code...
  async scrapeFromEdamam(location = "Mumbai") {
    const scrapedItems = [];
    if (!this.apiKeys.edamamAppId || !this.apiKeys.edamamAppKey)
      return scrapedItems;

    const cuisines = ["Indian", "Italian"];

    for (const cuisine of cuisines) {
      const q = `${cuisine} recipe`;

      try {
        // Try v2 with user header
        const v2Url = "https://api.edamam.com/api/recipes/v2";

        const headers = {
          "Edamam-Account-User": "default-user", // Add this required header
        };

        const res = await axios.get(v2Url, {
          headers, // Add headers here
          params: {
            type: "public",
            q,
            app_id: this.apiKeys.edamamAppId,
            app_key: this.apiKeys.edamamAppKey,
            to: 5, // Reduced for testing
          },
          timeout: 15000,
        });

        console.log(
          `✅ Edamam v2 success for ${cuisine}:`,
          res.data.hits?.length || 0,
          "recipes"
        );

        const hits = res.data.hits || [];
        for (const hit of hits) {
          const recipe = hit.recipe;
          if (!recipe) continue;

          const servings = Math.max(1, Math.round(recipe.yield || 2));
          const estimatedPrice = this.estimatePrice(
            servings,
            recipe.ingredients?.length || 5
          );

          const imageUrl = recipe.image ? recipe.image.substring(0, 500) : null;

          scrapedItems.push({
            name: recipe.label || "Unknown Recipe",
            platform: "edamam",
            price: estimatedPrice,
            original_price: Math.round(estimatedPrice * 1.15),
            discount_percent: 12,
            rating: 4.0 + Math.random() * 1.0,
            restaurant_store_name: "Edamam",
            category: "food",
            cuisine,
            location,
            platform_url: recipe.url || null,
            description: recipe.label
              ? `${recipe.label} - ${cuisine} cuisine`
              : `${cuisine} recipe`,
            image_url: imageUrl,
            dietary_info: JSON.stringify({
              caloriesPerServing:
                recipe.calories && recipe.yield
                  ? Math.round(recipe.calories / recipe.yield)
                  : null,
              healthLabels: recipe.healthLabels?.slice(0, 5) || [],
              dietLabels: recipe.dietLabels?.slice(0, 3) || [],
            }),
          });
        }
      } catch (err) {
        console.error(
          `❌ Edamam failed for ${cuisine}:`,
          err.response?.data || err.message
        );
        // Continue with next cuisine instead of trying v1 fallback
      }

      await this.delay(1000); // Rate limiting
    }

    return scrapedItems;
  }
  // ...existing code...

  async generateMockData(location = "Mumbai") {
    const items = [
      {
        name: "Butter Chicken",
        cuisine: "Indian",
        basePrice: 320,
        platform: "mock",
      },
      {
        name: "Margherita Pizza",
        cuisine: "Italian",
        basePrice: 299,
        platform: "mock",
      },
      {
        name: "Chicken Fried Rice",
        cuisine: "Chinese",
        basePrice: 180,
        platform: "mock",
      },
    ];
    return items.map((d) => ({
      name: d.name,
      platform: d.platform,
      price: d.basePrice,
      original_price: Math.round(d.basePrice * 1.15),
      discount_percent: 10 + Math.floor(Math.random() * 20),
      rating: 4.0 + Math.random() * 1.0,
      restaurant_store_name: "Mock",
      category: "food",
      cuisine: d.cuisine || "multi-cuisine",
      location,
      platform_url: null,
      description: `${d.name} - mock item`,
      image_url: null,
      dietary_info: JSON.stringify({}),
    }));
  }

  async scrapeAllPlatforms(location = "Mumbai") {
    const results = { totalScraped: 0, platformResults: {}, errors: [] };

    const spoon = await this.scrapeFromSpoonacular(location);
    results.platformResults.spoonacular = spoon;
    results.totalScraped += spoon.length;
    await this.saveScrapedItems(spoon);

    const eda = await this.scrapeFromEdamam(location);
    results.platformResults.edamam = eda;
    results.totalScraped += eda.length;
    await this.saveScrapedItems(eda);

    if (results.totalScraped < this.minItemsBeforeMock) {
      const mock = await this.generateMockData(location);
      results.platformResults.mock = mock;
      results.totalScraped += mock.length;
      await this.saveScrapedItems(mock);
    }

    return results;
  }

  async saveScrapedItems(items = []) {
    if (!Array.isArray(items) || items.length === 0) return;
    // Insert each item; use transaction per item to keep price history consistent
    for (const item of items) {
      try {
        await sequelize.transaction(async (t) => {
          const [dish] = await Dish.findOrCreate({
            where: {
              name: item.name,
              platform: item.platform,
              location: item.location || null,
            },
            defaults: {
              name: item.name,
              description: item.description || null,
              category: item.category || "food",
              brand: item.brand || null,
              image_url: item.image_url || null,
              platform: item.platform,
              platform_item_id: item.platform_item_id || null,
              restaurant_store_name: item.restaurant_store_name || null,
              price: item.price,
              original_price: item.original_price || null,
              discount_percent: item.discount_percent || null,
              rating: item.rating || null,
              availability:
                item.availability !== undefined ? item.availability : true,
              location: item.location || null,
              cuisine: item.cuisine || null,
              dietary_info:
                typeof item.dietary_info === "string"
                  ? item.dietary_info
                  : JSON.stringify(item.dietary_info || {}),
              platform_url: item.platform_url || null,
            },
            transaction: t,
          });

          // update dish if existed to reflect latest price
          await dish.update(
            {
              price: item.price,
              original_price: item.original_price,
              discount_percent: item.discount_percent,
              rating: item.rating,
              availability: true,
              updated_at: new Date(),
            },
            { transaction: t }
          );

          // Create price history
          await PriceHistory.create(
            {
              dish_id: dish.id,
              price: item.price,
              original_price: item.original_price,
              discount_percent: item.discount_percent,
              availability:
                item.availability !== undefined ? item.availability : true,
            },
            { transaction: t }
          );
        });
      } catch (err) {
        console.error("saveScrapedItems error:", err.message);
      }
    }
  }

  estimatePrice(servings = 2, ingredientCount = 5) {
    const basePrice = 60;
    const perServing = 60;
    const perIngredient = 10;
    return Math.round(
      basePrice + servings * perServing + ingredientCount * perIngredient
    );
  }

  detectCuisineFromRecipe(recipe = {}) {
    const title = (recipe.title || recipe.label || "").toLowerCase();
    if (!title) return "multi-cuisine";
    if (
      title.includes("curry") ||
      title.includes("biryani") ||
      title.includes("tikka")
    )
      return "Indian";
    if (title.includes("pizza") || title.includes("pasta")) return "Italian";
    if (title.includes("rice") || title.includes("noodle")) return "Chinese";
    return "multi-cuisine";
  }

  delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async triggerManualScrape(location = "Mumbai") {
    console.log(
      "MANUAL SCRAPPING//////////////////////////////////////////////"
    );
    return this.scrapeAllPlatforms(location);
  }

  async scrapeForSearch({query, cuisine, location, size, page, filters = {}}) {
    const scrapedItems = [];
    if (!this.apiKeys.spoonacular) return scrapedItems;

    console.log("filter destructuring....", {query, cuisine, location, size, page, ...filters})
     let filterAttributes = {...filters}
    console.log("filter destructed....", filterAttributes)

    try {
      const res = await axios.get(
        "https://api.spoonacular.com/recipes/complexSearch",
        {
          params: {
            apiKey: this.apiKeys.spoonacular,
            number: size,
            offset: page,
            tags: "breakfast,lunch,dinner",
            query,
            cuisine,
            ...filters
          },
          timeout: 15000,
        }
      );
      console.log("RESPONSE : ", res.data);
      
      for (const recipe of res.data.results || []) {
        const estimatedPrice = this.estimatePrice(
          recipe.servings,
          recipe.extendedIngredients?.length || 0
        );
        scrapedItems.push({
          name: recipe.title,
          platform: "spoonacular",
          price: estimatedPrice,
          original_price: Math.round(estimatedPrice * 1.2),
          discount_percent: 15,
          rating: 4.0 + Math.random() * 1.0,
          restaurant_store_name: "Spoonacular",
          category: "food",
          cuisine: this.detectCuisineFromRecipe(recipe),
          location,
          platform_url: recipe.sourceUrl,
          description: (recipe.summary || "")
            .replace(/<[^>]+>/g, "")
            .slice(0, 300),
          image_url: recipe.image || null,
          dietary_info: JSON.stringify({
            vegetarian: !!recipe.vegetarian,
            vegan: !!recipe.vegan,
            glutenFree: !!recipe.glutenFree,
            servings: recipe.servings,
          }),
        });
      }
    } catch (err) {
      console.error("Spoonacular error:", err.message);
    }
    console.log("SCRAPE DATA : ", scrapedItems);
    
    return scrapedItems;
  }
}

module.exports = new ScrapingService();
// ...existing code...
