const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
const { User } = require("../models"); // Import User model
const ApiError = require("../utils/ApiError");

const validateToken = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);

      // Lấy người dùng từ DB để kiểm tra trạng thái mới nhất
      const user = await User.findByPk(decoded.userId);

      if (!user) {
        return next(
          new ApiError(StatusCodes.UNAUTHORIZED, "Người dùng không tồn tại.")
        );
      }

      // KIỂM TRA NẾU TÀI KHOẢN BỊ KHÓA
      if (user.status === "blocked") {
        return next(
          new ApiError(StatusCodes.FORBIDDEN, "Tài khoản của bạn đã bị khóa.")
        );
      }

      req.userRole = user.role;
      req.userId = user.id;
      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        console.log("Token is InValid or has expired");
      }
      res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: "Token is Invalid or has expired" });
    }
  } else {
    console.error("User is not authorized or has expired");
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "User is not authorized or token is missing" });
  }
};
module.exports = validateToken;
