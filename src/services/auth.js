const db = require("../models");
const { hashPassword, passwordMatch } = require("../utils/hashPassword");
const ApiError = require("../utils/ApiError");
const generateToken = require("../utils/generateToken");
const verifyRefreshToken = require("../middlewares/verifyRefreshToken");

const register = async ({ name, email, password }) => {
  try {
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      throw new ApiError(409, "Email đã tồn tại");
    }
    const passwordHashed = await hashPassword(password);
    const user = await db.User.create({
      name,
      email,
      password: passwordHashed,
    });
    return user;
  } catch (error) {
    throw error;
  }
};

const login = async ({ email, password }) => {
  try {
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      throw new ApiError(404, "Email không tồn tại");
    }
    const isMatch = await passwordMatch(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, "Mật khẩu không đúng");
    }
    const { accessToken, refreshToken } = generateToken(user.id, user.role);
    return { user, accessToken, refreshToken };
  } catch (error) {
    throw error;
  }
};

const logout = async (userId) => {
  try {
    return [];
  } catch (error) {
    throw error;
  }
};

const refreshToken = async (refreshToken) => {
  try {
    const { userId, role } = await verifyRefreshToken(refreshToken);
    const newToken = generateToken(userId, role);
    return newToken;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
};
