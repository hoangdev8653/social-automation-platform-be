"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class AI_conversation extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      this.hasMany(models.AI_message, {
        foreignKey: "conversation_id",
        as: "messages",
      });
    }
  }

  AI_conversation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      title: DataTypes.STRING,
      model: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "AI_conversation",
    }
  );
  return AI_conversation;
};
