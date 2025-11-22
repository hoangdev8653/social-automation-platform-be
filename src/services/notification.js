const { StatusCodes } = require("http-status-codes");
const db = require("../models/");
const ApiError = require("../utils/ApiError");

const getAllNotification = async () => {
  try {
    const notifications = await db.Notification.findAll();
    return notifications;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getAllNotificationsForUser = async (userId) => {
  try {
    const notifications = await db.Notification.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
    });
    return notifications;
  } catch (error) {
    throw error;
  }
};

const getNotificationById = async (notificationId, userId) => {
  try {
    const notification = await db.Notification.findOne({
      where: { id: notificationId, user_id: userId },
    });
    if (!notification) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Thông báo không tồn tại hoặc bạn không có quyền truy cập."
      );
    }
    return notification;
  } catch (error) {
    throw error;
  }
};

const createNotification = async (data, transaction = null) => {
  try {
    const notification = await db.Notification.create(data, {
      transaction,
    });
    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
};

const updateStatusToRead = async (id) => {
  try {
    const notification = await db.Notification.findByPk(id);
    if (!notification) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Thông báo không tồn tại.");
    }
    const updatedNotification = await notification.update(
      { is_read: "true" },
      { new: true }
    );
    return updatedNotification;
  } catch (error) {
    throw error;
  }
};

const deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await getNotificationById(notificationId, userId); // Tái sử dụng hàm get để kiểm tra quyền
    await notification.destroy();
    return { message: "Xóa thông báo thành công." };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllNotification,
  getAllNotificationsForUser,
  getNotificationById,
  createNotification,
  updateStatusToRead,
  deleteNotification,
};
