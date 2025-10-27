const { Sequelize } = require('sequelize');
const sequelize = require('../config/db');

const User = require('./User');
const Dish = require('./Dish');
const PriceHistory = require('./PriceHistory');
const SearchHistory = require('./SearchHistory');

const models = {
  User,
  Dish,
  PriceHistory,
  SearchHistory
};

// Initialize models with proper DataTypes
Object.values(models).forEach(model => {
  if (model.initialize) {
    const modelInstance = model.initialize(sequelize, Sequelize.DataTypes);
    sequelize[modelInstance.name] = modelInstance;
  }
});

// Apply associations
Object.keys(sequelize.models).forEach(modelName => {
  if (sequelize.models[modelName].associate) {
    sequelize.models[modelName].associate(sequelize.models);
  }
});

module.exports = {
  ...sequelize.models,
  sequelize,
  Sequelize
};