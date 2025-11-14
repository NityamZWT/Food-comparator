const { Dish, SearchHistory, sequelize } = require("../models");
const { Op } = require("sequelize");

class SearchService {
  async searchDishes({ query, location, sortBy, filters, userId }) {
    // Save search history if user is authenticated
    if (userId) {
      await this.saveSearchHistory(userId, query, filters, location);
    }

    // Use dishService to get dishes
    const dishService = require("./dishService");
    const result = await dishService.getDishes({
      query,
      location,
      sortBy,
      ...filters,
    });

    // Update search history with result count
    if (userId) {
      await this.updateSearchResultsCount(userId, query, result.dishes.length);
    }

    return result;
  }

  async saveSearchHistory(userId, query, filters, location) {
    try {
      // Check if same user + query already exists
      const existing = await SearchHistory.findOne({
        where: {
          user_id: userId,
          search_query: query,
        },
      });

      if (existing) {
        // update + increment count
        const updatedCount = existing.results_count + 1;

        await existing.update({
          filters: JSON.stringify(filters || {}),
          location,
          results_count: updatedCount,
        });

        return existing;
      }

      // if not exists, create new
      return await SearchHistory.create({
        user_id: userId,
        search_query: query,
        filters: JSON.stringify(filters || {}),
        location,
        results_count: 1,
      });
    } catch (error) {
      console.error("Error saving search history:", error);
    }
  }

  async getSearchSuggestions(query) {
    if (!query || query.length < 2) {
      return [];
    }

    const dishes = await Dish.findAll({
      where: {
        name: {
          [Op.like]: `%${query}%`,
        },
      },
      attributes: [
        "name",
        [sequelize.fn("COUNT", sequelize.col("name")), "count"],
      ],
      group: ["name"],
      order: [[sequelize.literal("count"), "DESC"]],
      limit: 10,
    });

    return dishes.map((dish) => dish.name);
  }

  async getTrendingSearches() {
    const trending = await SearchHistory.findAll({
      attributes: [
        "search_query",
        [sequelize.fn("COUNT", sequelize.col("search_query")), "search_count"],
      ],
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      group: ["search_query"],
      order: [[sequelize.literal("search_count"), "DESC"]],
      limit: 10,
    });

    return trending;
  }

  async getSearchHistory(userId) {
    return await SearchHistory.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit: 20,
    });
  }

  async clearSearchHistory(id, userId) {
    if (id === "all") {
      await SearchHistory.destroy({ where: { user_id: userId } });
    } else {
      const search = await SearchHistory.findOne({
        where: { id, user_id: userId },
      });

      if (search) {
        await search.destroy();
      }
    }
  }
}

module.exports = new SearchService();
