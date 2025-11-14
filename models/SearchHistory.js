module.exports = {
  initialize(sequelize, DataTypes) {
    const SearchHistory = sequelize.define(
      "SearchHistory",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        search_query: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        filters: {
          type: DataTypes.TEXT, // Changed from JSON to TEXT
          defaultValue: "{}",
        },
        results_count: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },
        location: {
          type: DataTypes.STRING,
        },
      },
      {
        tableName: "search_history",
        indexes: [
          { fields: ["user_id"] },
          { fields: ["search_query"] },
          { fields: ["created_at"] },
        ],
      }
    );

    // Parse filters when retrieving
    SearchHistory.prototype.toJSON = function () {
      const values = { ...this.get() };
      if (values.filters && typeof values.filters === "string") {
        try {
          values.filters = JSON.parse(values.filters);
        } catch (e) {
          values.filters = {};
        }
      }
      return values;
    };

    SearchHistory.associate = (models) => {
      SearchHistory.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    };

    return SearchHistory;
  },
};
