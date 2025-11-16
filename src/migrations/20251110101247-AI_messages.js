"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("AI_messages", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "AI_conversations", // Liên kết với bảng vừa tạo ở trên
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      role: {
        type: Sequelize.ENUM("user", "model"), // Chỉ cho phép 2 giá trị này
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT, // Dùng TEXT để lưu nội dung dài
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Thêm index để tăng tốc độ truy vấn theo conversation_id
    await queryInterface.addIndex("AI_messages", ["conversation_id"]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("AI_messages");
  },
};
