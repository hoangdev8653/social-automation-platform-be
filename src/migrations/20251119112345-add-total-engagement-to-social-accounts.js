"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Thêm cột 'total_engagement' vào bảng 'SocialAccounts'
    await queryInterface.addColumn("SocialAccounts", "total_engagement", {
      type: Sequelize.INTEGER,
      allowNull: true, // Cho phép giá trị null ban đầu
      defaultValue: 0, // Đặt giá trị mặc định là 0
    });
  },

  async down(queryInterface, Sequelize) {
    // Xóa cột 'total_engagement' nếu cần rollback
    await queryInterface.removeColumn("SocialAccounts", "total_engagement");
  },
};
