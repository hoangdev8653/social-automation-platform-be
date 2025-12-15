const { StatusCodes } = require("http-status-codes");
const authService = require("../services/auth.js");

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const user = await authService.register({ name, email, password });
    return res
      .status(StatusCodes.CREATED)
      .json({ status: 201, message: "Xử lý thành công", content: user });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login({
      email,
      password,
    });

    // Loại bỏ mật khẩu khỏi đối tượng user trước khi trả về
    const { password: removedPassword, ...userInfo } = user.dataValues;

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Chỉ bật secure ở môi trường production (HTTPS)
      path: "/",
      sameSite: "strict",
    });

    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: userInfo,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    res.clearCookie("refreshToken");
    await authService.logout(userId);
    return res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công" });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    const { accessToken, refreshToken } = await authService.refreshToken(
      oldRefreshToken
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Chỉ bật secure ở môi trường production (HTTPS)
      path: "/",
      sameSite: "strict",
    });
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
};
