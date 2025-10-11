"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Media extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Media thuộc về nhiều Post thông qua bảng PostMedia
      Media.belongsToMany(models.Post, {
        through: "PostMedia",
        foreignKey: "media_id",
        otherKey: "post_id",
      });
    }
  }
  Media.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      type: DataTypes.STRING,
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      metadata: DataTypes.JSON,
    },
    {
      sequelize,
      modelName: "Media",
      updatedAt: false, // Bảng này không cần updatedAt
    }
  );
  return Media;
};
