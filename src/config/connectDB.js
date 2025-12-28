const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || "postgres",
    logging: false,
  }
);

const connectDB = async function ConnectionDB() {
  try {
    await sequelize.authenticate();
    console.log("Kết nối database thành công!");
  } catch (error) {
    console.error("Không thể kết nối đến database:", error);
  }
};

module.exports = { connectDB, sequelize };
