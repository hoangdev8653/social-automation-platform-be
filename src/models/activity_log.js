"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ActivityLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Một activity log thuộc về một User
      ActivityLog.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }
  ActivityLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "user_id",
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      targetId: {
        type: DataTypes.UUID,
        field: "target_id",
      },
      targetType: {
        type: DataTypes.STRING,
        field: "target_type",
      },
      details: {
        type: DataTypes.STRING,
      },
      createdAt: {
        type: DataTypes.DATE,
        field: "created_at",
      },
    },
    {
      sequelize,
      modelName: "ActivityLog",
      tableName: "activity_logs", // Tên bảng trong DB
      updatedAt: false, // Không sử dụng trường updatedAt
      createdAt: "created_at", // Chỉ định tên cột cho createdAt
    }
  );
  return ActivityLog;
};
