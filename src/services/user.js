const db = require("../models");
const ApiError = require("../utils/ApiError");
const { hashPassword, passwordMatch } = require("../utils/hashPassword");

const getAllUser = async () => {
  try {
    const users = await db.User.findAll();
    return users;
  } catch (error) {
    throw error;
  }
};

const getUserById = async (id) => {
  try {
    const user = await db.User.findOne({ where: { id } });
    return user;
  } catch (error) {
    throw error;
  }
};

const updateUser = async (id, { name }) => {
  try {
    const user = await db.User.findOne({ where: { id } });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    delete updateData.password;
    const newUser = await db.User.update({ name }, { where: { id } });
    return newUser;
  } catch (error) {
    throw error;
  }
};

const updatePassword = async (userId, { password, newPassword }) => {
  try {
    const user = await db.User.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const isPasswordValid = await passwordMatch(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Mật khẩu không chính xác");
    }
    const newPasswordHashed = await hashPassword(newPassword);
    const updated = await db.User.update(
      { password: newPasswordHashed },
      { where: { id: userId } }
    );
    return updated;
  } catch (error) {
    throw error;
  }
};

const updateRole = async (userId, { id, role }) => {
  try {
    const user = await db.User.findOne({ where: { id } });
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const updatedUser = await db.User.update({ role }, { where: { id } });
    return updatedUser;
  } catch (error) {
    throw error;
  }
};

const resetPassword = async (id) => {
  try {
    const user = await db.User.findOne({ where: { id } });
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const defaultPassword = "123456";
    const hashedPassword = await hashPassword(defaultPassword);

    const updated = await db.User.update(
      { password: hashedPassword },
      { where: { id } }
    );

    return updated;
  } catch (error) {
    throw error;
  }
};

const deleteUser = async (id) => {
  try {
    const user = await db.User.findOne({ where: { id } });
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    return await db.User.destroy({ where: { id } });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllUser,
  getUserById,
  updateUser,
  updatePassword,
  updateRole,
  resetPassword,
  deleteUser,
};
