const { Sequelize } = require("sequelize");
const ApiError = require("../utils/ApiError");

const handleSequelizeValidationError = (err) => {
  const errors = err.errors.map((error) => ({
    field: error.path,
    message: error.message,
  }));
  const message = "Dữ liệu không hợp lệ.";
  return new ApiError(400, message, true, errors);
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Xử lý lỗi từ Sequelize Validation
  if (err instanceof Sequelize.ValidationError) {
    error = handleSequelizeValidationError(err);
  }

  // Xử lý các lỗi ApiError tự định nghĩa
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Đã có lỗi xảy ra từ server";
    error = new ApiError(statusCode, message, false, err.stack);
  }

  const response = {
    code: error.statusCode,
    message: error.message,
    ...(error.errors && { errors: error.errors }), // Thêm chi tiết lỗi nếu có
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }), // Chỉ hiện stack ở môi trường dev
  };

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
