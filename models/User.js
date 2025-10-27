const bcrypt = require('bcryptjs');

module.exports = {
  initialize(sequelize, DataTypes) {
    const User = sequelize.define('User', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 100]
        }
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [6, 100]
        }
      },
      role: {
        type: DataTypes.ENUM('admin', 'customer'),
        defaultValue: 'customer'
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true
      },
      preferences: {
        type: DataTypes.TEXT, // Changed from JSON to TEXT for MySQL compatibility
        defaultValue: '{}'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    }, {
      tableName: 'users',
      hooks: {
        beforeCreate: async (user) => {
          user.password = await bcrypt.hash(user.password, 12);
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            user.password = await bcrypt.hash(user.password, 12);
          }
        }
      }
    });

    User.prototype.validatePassword = async function(password) {
      return await bcrypt.compare(password, this.password);
    };

    User.prototype.toJSON = function() {
      const values = { ...this.get() };
      delete values.password;
      // Parse preferences from TEXT to JSON
      if (values.preferences && typeof values.preferences === 'string') {
        try {
          values.preferences = JSON.parse(values.preferences);
        } catch (e) {
          values.preferences = {};
        }
      }
      return values;
    };

    return User;
  }
};