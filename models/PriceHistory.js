module.exports = {
  initialize(sequelize, DataTypes) {
    const PriceHistory = sequelize.define('PriceHistory', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      dish_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      original_price: {
        type: DataTypes.FLOAT
      },
      discount_percent: {
        type: DataTypes.INTEGER
      },
      availability: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      scraped_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'price_history',
      indexes: [
        { fields: ['dish_id', 'scraped_at'] }
      ]
    });

    return PriceHistory;
  },

  associate(models) {
    const { PriceHistory, Dish } = models;
    PriceHistory.belongsTo(Dish, {
      foreignKey: 'dish_id',
      as: 'dish'
    });
  }
};