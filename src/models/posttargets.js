"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class PostTargets extends Model {
    static associate(models) {
      // Một PostTarget thuộc về một Post
      PostTargets.belongsTo(models.Post, {
        foreignKey: "post_id",
      });

      // Một PostTarget thuộc về một SocialAccount
      PostTargets.belongsTo(models.SocialAccount, {
        foreignKey: "social_account_id",
      });
    }
  }
  PostTargets.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      post_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      social_account_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "pending",
      },
      published_url: DataTypes.STRING,
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: "PostTargets",
      updatedAt: false, // Bảng này không cần updatedAt
    }
  );
  return PostTargets;
};
