"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Post extends Model {
    static associate(models) {
      Post.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "author",
      });

      Post.belongsTo(models.User, {
        foreignKey: "approved_by",
        as: "approver",
      });

      Post.belongsToMany(models.Media, {
        through: "PostMedia",
        foreignKey: "post_id",
        otherKey: "media_id",
        as: "media",
      });

      Post.belongsToMany(models.SocialAccount, {
        through: "PostTargets",
        foreignKey: "post_id",
        otherKey: "social_account_id",
        as: "targets",
      });

      Post.hasMany(models.PostTargets, {
        foreignKey: "post_id",
        as: "postTargets",
      });
    }
  }
  Post.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: { type: DataTypes.UUID, allowNull: false },
      caption: DataTypes.TEXT,
      hashtags: DataTypes.TEXT,
      status: {
        type: DataTypes.STRING,
        defaultValue: "draft",
      },
      scheduled_time: DataTypes.DATE,
      approved_by: DataTypes.UUID,
      approved_at: DataTypes.DATE,
      rejected_reason: DataTypes.TEXT,
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
      modelName: "Post",
    }
  );
  return Post;
};
