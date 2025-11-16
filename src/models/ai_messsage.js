"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class AI_message extends Model {
    static associate(models) {
      this.belongsTo(models.AI_conversation, {
        foreignKey: "conversation_id",
        as: "conversation",
      });
    }
  }

  AI_message.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      conversation_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("user", "model"),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "AI_message",
    }
  );

  return AI_message;
};
