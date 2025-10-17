module.exports = (sequelize, DataTypes) => {
  const Dish = sequelize.define('Dish', {
    name: { type: DataTypes.STRING, allowNull: false },
    platform: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    rating: { type: DataTypes.FLOAT, allowNull: true },
    cuisine: { type: DataTypes.STRING },
  });
  return Dish;
};
