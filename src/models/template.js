"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Template extends Model {
    static associate(models) {
      // Một Template thuộc về một TemplateCategory
      Template.belongsTo(models.TemplateCategory, {
        foreignKey: "category_id",
        as: "category",
      });
    }
  }

  Template.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      type: {
        type: DataTypes.ENUM("caption", "hashtag"),
        allowNull: false,
      },
      category_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT,
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
      modelName: "Template",
      tableName: "Templates", // ✅ phải đúng với migration: Templates
    }
  );

  return Template;
};
