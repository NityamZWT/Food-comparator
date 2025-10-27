const dishService = require('../services/dishService');
const response = require('../utils/response');

exports.getDishes = async (req, res, next) => {
  try {
    const filters = req.query;
    const result = await dishService.getDishes(filters);
    response.success(res, 'Dishes retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

exports.getDishById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dish = await dishService.getDishById(id);
    response.success(res, 'Dish retrieved successfully', dish);
  } catch (error) {
    next(error);
  }
};

exports.getPriceHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { days = 7 } = req.query;
    const history = await dishService.getPriceHistory(id, parseInt(days));
    response.success(res, 'Price history retrieved successfully', history);
  } catch (error) {
    next(error);
  }
};

exports.createDish = async (req, res, next) => {
  try {
    const dish = await dishService.createDish(req.body);
    response.created(res, 'Dish created successfully', dish);
  } catch (error) {
    next(error);
  }
};

exports.updateDish = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dish = await dishService.updateDish(id, req.body);
    response.success(res, 'Dish updated successfully', dish);
  } catch (error) {
    next(error);
  }
};

exports.deleteDish = async (req, res, next) => {
  try {
    const { id } = req.params;
    await dishService.deleteDish(id);
    response.success(res, 'Dish deleted successfully');
  } catch (error) {
    next(error);
  }
};