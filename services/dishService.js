const { Dish } = require('../models');

exports.addDish = async (data) => {
  const dish = await Dish.create(data);
  return dish;
};

exports.getDishes = async (filters = {}) => {
  const where = {};
  if (filters.name) where.name = filters.name;
  if (filters.platform) where.platform = filters.platform;
  if (filters.cuisine) where.cuisine = filters.cuisine;

  const dishes = await Dish.findAll({ where });
  return dishes;
};
