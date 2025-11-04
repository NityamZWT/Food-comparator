const searchService = require('../services/searchService');
const response = require('../utils/response');

exports.searchDishes = async (req, res, next) => {
  try {
    const { query, location, sortBy, ...filters } = req.query;
    const userId = req.user?.id;
    console.log("REQ QUERY-----",req.query)
    const result = await searchService.searchDishes({
      query,
      location,
      sortBy,
      filters,
      userId
    });
    
    response.success(res, 'Search completed successfully', result);
  } catch (error) {
    next(error);
  }
};

exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const { query } = req.query;
    const suggestions = await searchService.getSearchSuggestions(query);
    response.success(res, 'Suggestions retrieved successfully', suggestions);
  } catch (error) {
    next(error);
  }
};

exports.getTrendingSearches = async (req, res, next) => {
  try {
    const trending = await searchService.getTrendingSearches();
    response.success(res, 'Trending searches retrieved successfully', trending);
  } catch (error) {
    next(error);
  }
};

exports.getSearchHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const history = await searchService.getSearchHistory(userId);
    response.success(res, 'Search history retrieved successfully', history);
  } catch (error) {
    next(error);
  }
};

exports.clearSearchHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await searchService.clearSearchHistory(id, userId);
    response.success(res, 'Search history cleared successfully');
  } catch (error) {
    next(error);
  }
};