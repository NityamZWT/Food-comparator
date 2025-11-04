// ...existing code...
module.exports = {
  initialize(sequelize, DataTypes) {
    const Dish = sequelize.define('Dish', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT
      },
      category: {
        type: DataTypes.ENUM('food', 'grocery', 'beverage'),
        allowNull: false
      },
      brand: {
        type: DataTypes.STRING
      },
      image_url: {
        type: DataTypes.STRING(1000),
        validate: {
          isUrl: true
        }
      },
      // Changed to STRING to allow api_spoonacular / api_edamam / mock platforms
      platform: {
        type: DataTypes.STRING,
        allowNull: false
      },
      platform_item_id: {
        type: DataTypes.STRING
      },
      restaurant_store_name: {
        type: DataTypes.STRING
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
      rating: {
        type: DataTypes.FLOAT,
        validate: {
          min: 0,
          max: 5
        }
      },
      review_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      availability: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      location: {
        type: DataTypes.STRING
      },
      cuisine: {
        type: DataTypes.STRING
      },
      dietary_info: {
        type: DataTypes.TEXT,
        defaultValue: '{}'
      },
      platform_url: {
        type: DataTypes.STRING,
        validate: {
          isUrl: true
        }
      }
    }, {
      tableName: 'dishes',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { fields: ['name'] },
        { fields: ['platform'] },
        { fields: ['category'] },
        { fields: ['location'] },
        { fields: ['price'] }
      ]
    });

    // Parse dietary_info when retrieving
    Dish.prototype.toJSON = function() {
      const values = { ...this.get() };
      if (values.dietary_info && typeof values.dietary_info === 'string') {
        try {
          values.dietary_info = JSON.parse(values.dietary_info);
        } catch (e) {
          values.dietary_info = {};
        }
      }
      return values;
    };

    return Dish;
  },

  associate(models) {
    // Fix: Use the actual model instances
    if (models.Dish && models.PriceHistory) {
      models.Dish.hasMany(models.PriceHistory, {
        foreignKey: 'dish_id',
        as: 'priceHistory'
      });
    }
  }
};