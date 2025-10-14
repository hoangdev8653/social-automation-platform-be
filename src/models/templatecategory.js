"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TemplateCategory extends Model {
    static associate(models) {
      // associations here
    }
  }

  TemplateCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
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
      modelName: "TemplateCategory",
      tableName: "TemplateCategories",
    }
  );

  return TemplateCategory;
};
