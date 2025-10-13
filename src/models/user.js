"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Một User có thể tạo nhiều Post
      User.hasMany(models.Post, {
        foreignKey: "user_id",
        as: "createdPosts",
      });

      // Một User có nhiều Notification
      User.hasMany(models.Notification, {
        foreignKey: "user_id",
        as: "notifications",
      });

      // Một User (admin) có thể duyệt nhiều Post
      User.hasMany(models.Post, {
        foreignKey: "approved_by",
        as: "approvedPosts",
      });
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        defaultValue: "user",
        validate: {
          isIn: [["user", "admin"]],
        },
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "active", // 'active' | 'blocked'
        allowNull: false,
        validate: {
          isIn: [["active", "blocked"]],
        },
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
