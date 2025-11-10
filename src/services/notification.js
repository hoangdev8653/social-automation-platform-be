const { StatusCodes } = require("http-status-codes");
const db = require("../models/");
const ApiError = require("../utils/ApiError");

/**
 * Lấy tất cả thông báo cho một người dùng cụ thể.
 * @param {string} userId - ID của người dùng.
 * @returns {Promise<Array<db.Notification>>}
 */
const getAllNotificationsForUser = async (userId) => {
  try {
    // Sắp xếp các thông báo mới nhất lên đầu
    const notifications = await db.Notification.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
    });
    return notifications;
  } catch (error) {
    throw error;
  }
};

/**
 * Lấy một thông báo bằng ID, đảm bảo nó thuộc về người dùng.
 * @param {string} notificationId - ID của thông báo.
 * @param {string} userId - ID của người dùng.
 * @returns {Promise<db.Notification>}
 */
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

/**
 * Tạo một thông báo mới.
 * Hàm này được thiết kế để gọi từ các service khác (ví dụ: postService).
 * @param {object} data - Dữ liệu thông báo (user_id, type, message, etc.)
 * @param {object} [transaction=null] - Giao dịch Sequelize nếu có.
 * @returns {Promise<db.Notification>}
 */
const createNotification = async (data, transaction = null) => {
  try {
    const notification = await db.Notification.create(data, {
      transaction,
    });
    return notification;
  } catch (error) {
    // Không ném ApiError ở đây để không làm hỏng transaction cha
    console.error("Failed to create notification:", error);
    throw error; // Ném lỗi gốc để transaction cha có thể rollback
  }
};

/**
 * Đánh dấu một thông báo là đã đọc.
 * @param {string} notificationId - ID của thông báo.
 * @param {string} userId - ID của người dùng.
 * @returns {Promise<db.Notification>}
 */
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

/**
 * Xóa một thông báo.
 * @param {string} notificationId - ID của thông báo.
 * @param {string} userId - ID của người dùng.
 * @returns {Promise<{message: string}>}
 */
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
  getAllNotificationsForUser,
  getNotificationById,
  createNotification,
  updateStatusToRead,
  deleteNotification,
};
