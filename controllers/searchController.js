const scrapingService = require("../services/scrapingService");
const searchService = require("../services/searchService");
const response = require("../utils/response");

exports.searchDishes = async (req, res, next) => {
  try {
    const { query, location, cuisine, size, page, ...filters } = req.query;
    const userId = req.user?.id;

    console.log("after-----------------------------");
    
    const result = await scrapingService.scrapeForSearch({
      query,
      location,
      filters,
      size,
      page,
    });
    
    if (userId && result && result.length > 0) {
      console.log("INSIDE?????????????????????????????????????????????????????????");
      
      // await searchService.updateSearchResultsCount(userId, query);
      await searchService.saveSearchHistory(userId, query, filters, location);
    }
    
    response.success(res, "Search completed successfully", result);
  } catch (error) {
    next(error);
  }
};

exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const { query } = req.query;
    const suggestions = await searchService.getSearchSuggestions(query);
    response.success(res, "Suggestions retrieved successfully", suggestions);
  } catch (error) {
    next(error);
  }
};

exports.getTrendingSearches = async (req, res, next) => {
  try {
    const trending = await searchService.getTrendingSearches();
    response.success(res, "Trending searches retrieved successfully", trending);
  } catch (error) {
    next(error);
  }
};

exports.getSearchHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const history = await searchService.getSearchHistory(userId);
    response.success(res, "Search history retrieved successfully", history);
  } catch (error) {
    next(error);
  }
};

exports.clearSearchHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await searchService.clearSearchHistory(id, userId);
    response.success(res, "Search history cleared successfully");
  } catch (error) {
    next(error);
  }
};
