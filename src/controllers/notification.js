const { StatusCodes } = require("http-status-codes");
const notificationService = require("../services/notification.js");

const getAllNotificationsForUser = async (req, res, next) => {
  try {
    // Lấy userId từ token đã được xác thực bởi middleware
    const userId = req.userId;

    const notifications = await notificationService.getAllNotificationsForUser(
      userId
    );
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Lấy danh sách thông báo thành công.",
      content: notifications,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getNotificationById = async (req, res, next) => {
  try {
    const { id: notificationId } = req.params;
    const userId = req.userId;

    const notification = await notificationService.getNotificationById(
      notificationId,
      userId
    );
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Lấy thông tin thông báo thành công.",
      content: notification,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// Hàm này thường không nên có API public trừ khi dành cho admin
// vì thông báo được tạo tự động bởi các service khác.
// Giữ lại để tham khảo hoặc cho mục đích quản trị.
const createNotification = async (req, res, next) => {
  try {
    const data = req.body;
    // Lưu ý: Cần có cơ chế phân quyền để chỉ admin mới được tạo thông báo tùy ý.
    const notification = await notificationService.createNotification(data);
    return res.status(StatusCodes.CREATED).json({
      status: 201,
      message: "Tạo thông báo thành công.",
      content: notification,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const updateStatusToRead = async (req, res, next) => {
  try {
    const { id: notificationId } = req.params;
    const userId = req.userId;

    const notification = await notificationService.updateStatusToRead(
      notificationId,
      userId
    );
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Đã đánh dấu thông báo là đã đọc.",
      content: notification,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id: notificationId } = req.params;
    const userId = req.userId;

    const result = await notificationService.deleteNotification(
      notificationId,
      userId
    );
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: result.message,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  getAllNotificationsForUser,
  getNotificationById,
  createNotification,
  updateStatusToRead,
  deleteNotification,
};
