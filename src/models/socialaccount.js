"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SocialAccount extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      SocialAccount.belongsTo(models.Platform, {
        foreignKey: "platform_id",
        as: "platform",
      });
      // Một SocialAccount có thể là target của nhiều Post
      SocialAccount.belongsToMany(models.Post, {
        through: "PostTargets",
        foreignKey: "social_account_id",
        otherKey: "post_id",
        as: "posts",
      });
    }
  }
  SocialAccount.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      account_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      account_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      account_image: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // Cho phép access_token là null vì với YouTube, chúng ta dùng refresh_token
      access_token: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Thêm refresh_token cho các nền tảng như YouTube
      refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      fan_counts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
      modelName: "SocialAccount",
    }
  );
  return SocialAccount;
};
