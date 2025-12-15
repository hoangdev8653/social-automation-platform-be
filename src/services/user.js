const db = require("../models");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");
const { hashPassword, passwordMatch } = require("../utils/hashPassword");

const getAllUser = async (paginationOptions) => {
  try {
    const page = parseInt(paginationOptions.page, 10);
    const limit = parseInt(paginationOptions.limit, 10);
    const offset = (page - 1) * limit;
    const { count: totalItem, rows: users } = await db.User.findAndCountAll({
      limit: limit,
      offset: offset,
      order: [["createdAt", "DESC"]],
    });
    const totalPages = Math.ceil(totalItem / limit);
    return {
      users,
      totalPages,
      currentPage: page,
      totalItem,
    };
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
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
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

const updateRole = async (adminId, userIdToUpdate, newRole) => {
  try {
    const userToUpdate = await db.User.findOne({
      where: { id: userIdToUpdate },
    });
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    const oldRole = userToUpdate.role;
    if (oldRole === newRole) {
      return { message: "Vai trò không thay đổi." };
    }

    userToUpdate.role = newRole;
    await userToUpdate.save();

    // Ghi log thành công
    try {
      await db.ActivityLog.create({
        user_id: adminId,
        action: "Cập nhật vai trò",
        target_id: userIdToUpdate,
        target_type: "user",
        details: `Admin đã thay đổi vai trò của ${userToUpdate.name} từ '${oldRole}' thành '${newRole}'.`,
      });
    } catch (logError) {
      console.error("Ghi log cập nhật vai trò thất bại:", logError);
    }

    const updatedUser = await db.User.findOne({
      where: { id: userIdToUpdate },
    });
    return updatedUser;
  } catch (error) {
    // Ghi log thất bại
    try {
      await db.ActivityLog.create({
        user_id: adminId,
        action: "Cập nhật vai trò thất bại",
        target_id: userIdToUpdate,
        target_type: "user",
        details: `Cập nhật vai trò cho người dùng (ID: ${userIdToUpdate}) thất bại. Lỗi: ${error.message}`,
      });
    } catch (logError) {
      console.error("Ghi log lỗi cũng thất bại:", logError);
    }
    throw error;
  }
};

const unLockAccount = async (userId, { id }) => {
  try {
    const user = await db.User.findOne({ where: { id } });
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User Not Found");
    }
    if (user.status === "active") {
      return;
    }
    const updated = await db.User.update(
      { status: "active" },
      { where: { id } }
    );
    try {
      await db.ActivityLog.create({
        user_id: userId,
        action: "Mở khóa tài khoản",
        targetId: id,
        targetType: "user",
        details: `Admin đã khóa tài khoản người dùng: ${user.name}).`,
      });
    } catch (logError) {
      console.error("Ghi log khóa tài khoản thất bại:", logError);
    }

    return updated;
  } catch (error) {
    try {
      await db.ActivityLog.create({
        user_id: userId,
        action: "Mở khóa tài khoản thất bại",
        targetId: id,
        targetType: "user",
        details: `Khóa tài khoản thất bại`,
      });
    } catch (logError) {
      console.error("Ghi log lỗi cũng thất bại:", logError);
    }
    throw error;
  }
};

const resetPassword = async (adminId, userIdToReset) => {
  try {
    const user = await db.User.findOne({ where: { id: userIdToReset } });
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    const defaultPassword = "123456";
    const hashedPassword = await hashPassword(defaultPassword);

    const updated = await db.User.update(
      { password: hashedPassword },
      { where: { id: userIdToReset } }
    );

    // Ghi log thành công
    try {
      await db.ActivityLog.create({
        user_id: adminId,
        action: "Đặt lại mật khẩu",
        target_id: userIdToReset,
        target_type: "user",
        details: `Admin đã đặt lại mật khẩu cho người dùng: ${user.name} (ID: ${user.id}).`,
      });
    } catch (logError) {
      console.error("Ghi log đặt lại mật khẩu thất bại:", logError);
    }

    return updated;
  } catch (error) {
    // Ghi log thất bại
    try {
      await db.ActivityLog.create({
        user_id: adminId,
        action: "Đặt lại mật khẩu thất bại",
        target_id: userIdToReset,
        target_type: "user",
        details: `Đặt lại mật khẩu cho người dùng (ID: ${userIdToReset}) thất bại. Lỗi: ${error.message}`,
      });
    } catch (logError) {
      console.error("Ghi log lỗi cũng thất bại:", logError);
    }
    throw error;
  }
};

const lockAccount = async (userId, { id }) => {
  try {
    const user = await db.User.findOne({ where: { id } });
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User Not Found");
    }
    const updated = await db.User.update(
      { status: "blocked" },
      { where: { id } }
    );

    // Ghi log thành công
    try {
      await db.ActivityLog.create({
        user_id: userId,
        action: "Khóa tài khoản",
        targetId: id,
        targetType: "user",
        details: `Admin đã khóa tài khoản người dùng: ${user.name}.`,
      });
    } catch (logError) {
      console.error("Ghi log khóa tài khoản thất bại:", logError);
    }

    return updated;
  } catch (error) {
    // Ghi log thất bại
    try {
      await db.ActivityLog.create({
        user_id: userId,
        action: "Khóa tài khoản thất bại",
        targetId: id,
        targetType: "user",
        details: `Khóa tài khoản ${user.name} thất bại`,
      });
    } catch (logError) {
      console.error("Ghi log lỗi cũng thất bại:", logError);
    }
    throw error;
  }
};

const deleteUser = async (adminId, userIdToDelete) => {
  try {
    const user = await db.User.findOne({ where: { id: userIdToDelete } });
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    const userInfoForLog = { name: user.name, id: user.id };
    await db.User.destroy({ where: { id: userIdToDelete } });

    // Ghi log thành công
    await db.ActivityLog.create({
      user_id: adminId,
      action: "Xóa tài khoản",
      target_id: userInfoForLog.id,
      target_type: "user",
      details: `Admin đã xóa vĩnh viễn tài khoản: ${userInfoForLog.name} (ID: ${userInfoForLog.id}).`,
    });
  } catch (error) {
    // Ghi log thất bại
    await db.ActivityLog.create({
      user_id: adminId,
      action: "Xóa tài khoản thất bại",
      target_id: userIdToDelete,
      target_type: "user",
      details: `Xóa tài khoản (ID: ${userIdToDelete}) thất bại. Lỗi: ${error.message}`,
    });
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
  lockAccount,
  unLockAccount,
  deleteUser,
};
