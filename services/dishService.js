
const { Dish, PriceHistory, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.addDish = async (data) => {
  return Dish.create(data);
};

exports.getDishes = async (filters = {}) => {
  console.log(" filter : ", filters)
  const where = {};
  if (filters.query) where.name = { [Op.like]: `%${filters.name}%` };
  if (filters.platform) where.platform = filters.platform;
  if (filters.cuisine) where.cuisine = filters.cuisine;
  if (filters.location) where.location = filters.location;
console.log(" where :", where)
  return Dish.findAll({ where });
};

exports.getDishById = async (id) => {
  return Dish.findByPk(id, {
    include: [{ model: PriceHistory, as: 'priceHistory' }]
  });
};

exports.getPriceHistory = async (dishId, days = 7) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return PriceHistory.findAll({
    where: {
      dish_id: dishId,
      created_at: { [Op.gte]: since }
    },
    order: [['created_at', 'DESC']]
  });
};

exports.updateDish = async (id, data) => {
  const dish = await Dish.findByPk(id);
  if (!dish) throw new Error('Dish not found');
  await dish.update(data);
  return dish;
};

exports.deleteDish = async (id) => {
  const dish = await Dish.findByPk(id);
  if (!dish) throw new Error('Dish not found');
  await dish.destroy();
  return true;
};
// ...existing code...