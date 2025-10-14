"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Templates", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM("caption", "hashtag"), // Dùng ENUM cho các giá trị cố định
        allowNull: false,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: true, // Cho phép NULL khi category bị xóa
        references: {
          model: "TemplateCategories", // Tên bảng đã tạo trước đó
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL", // Nếu danh mục bị xóa, trường này sẽ thành NULL
      },
      title: {
        type: Sequelize.STRING(100),
        allowNull: true, // Tiêu đề có thể không bắt buộc
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Templates");
  },
};
