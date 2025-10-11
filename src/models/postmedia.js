"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class PostMedia extends Model {
    static associate(models) {
      // PostMedia thuộc về một Post
      PostMedia.belongsTo(models.Post, {
        foreignKey: "post_id",
      });
      // PostMedia thuộc về một Media
      PostMedia.belongsTo(models.Media, {
        foreignKey: "media_id",
      });
    }
  }
  PostMedia.init(
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
      media_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "PostMedia",
      timestamps: false, // Bảng nối thường không cần timestamps
    }
  );
  return PostMedia;
};
