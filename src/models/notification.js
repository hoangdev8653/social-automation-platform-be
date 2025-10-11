"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Một thông báo thuộc về một người dùng (người nhận)
      Notification.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "recipient",
      });
    }
  }
  Notification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        // Người nhận thông báo
        type: DataTypes.UUID,
        allowNull: false,
      },
      type: {
        // Loại thông báo, vd: 'post_approved', 'post_rejected'
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      related_entity_id: DataTypes.UUID, // ID của đối tượng liên quan (vd: post_id)
      related_entity_type: DataTypes.STRING, // Loại đối tượng liên quan (vd: 'post')
    },
    {
      sequelize,
      modelName: "Notification",
    }
  );
  return Notification;
};
