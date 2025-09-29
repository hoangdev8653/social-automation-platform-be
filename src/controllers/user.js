const { StatusCodes } = require("http-status-codes");
const userService = require("../services/user.js");

const getAllUser = async (req, res, next) => {
  try {
    const users = await userService.getAllUser();
    res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", data: users });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", data: user });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const user = await userService.updateUser(id, { name });
    res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", data: user });
  } catch (error) {
    next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { password, newPassword } = req.body;
    const user = await userService.updatePassword(userId, {
      password,
      newPassword,
    });
    res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", data: user });
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { role } = req.body;
    const user = await userService.updateRole(userId, { id, role });
    res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", data: user });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.deleteUser(id);
    res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUser,
  getUserById,
  updateUser,
  updatePassword,
  updateRole,
  deleteUser,
};
