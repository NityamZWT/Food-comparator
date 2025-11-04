// ...existing code...
const { Sequelize } = require('sequelize');
const sequelize = require('../config/db');

const UserModel = require('./User');
const DishModel = require('./Dish');
const PriceHistoryModel = require('./PriceHistory');
const SearchHistoryModel = require('./SearchHistory');

// initialize models
const User = UserModel.initialize(sequelize, Sequelize.DataTypes);
const Dish = DishModel.initialize(sequelize, Sequelize.DataTypes);
const PriceHistory = PriceHistoryModel.initialize(sequelize, Sequelize.DataTypes);
const SearchHistory = SearchHistoryModel.initialize(sequelize, Sequelize.DataTypes);

// collect initialized models
const models = {
  User,
  Dish,
  PriceHistory,
  SearchHistory
};

// call associate exported by each module (if present) with the initialized models
if (typeof UserModel.associate === 'function') UserModel.associate(models);
if (typeof DishModel.associate === 'function') DishModel.associate(models);
if (typeof PriceHistoryModel.associate === 'function') PriceHistoryModel.associate(models);
if (typeof SearchHistoryModel.associate === 'function') SearchHistoryModel.associate(models);

module.exports = {
  ...models,
  sequelize,
  Sequelize
};
// ...existing code...