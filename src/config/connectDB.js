const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

// Cấu hình kết nối
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST, // thay đổi nếu cần
    dialect: process.env.DB_DIALECT, // 'mysql' | 'sqlite' | 'postgres' | 'mssql'
    // Các tùy chọn khác nếu cần, ví dụ: logging: false
  }
);

// Hàm kiểm tra kết nối
const connectDB = async function ConnectionDB() {
  try {
    await sequelize.authenticate();
    console.log("Kết nối database thành công!");
  } catch (error) {
    console.error("Không thể kết nối đến database:", error);
  }
};

module.exports = { connectDB, sequelize };
