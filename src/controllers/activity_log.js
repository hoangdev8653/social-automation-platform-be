const { StatusCodes } = require("http-status-codes");
const activityLogService = require("../services/activity_log.js");

const getAllActivityLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await activityLogService.getAllActivityLogs({ page, limit });
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: result.data,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const createActivity = async (req, res, next) => {
  try {
    const data = req.body;
    const newActivity = await activityLogService.createActivity(data);
    return res.status(StatusCodes.CREATED).json({
      status: 201,
      message: "Tạo activity log thành công",
      content: newActivity,
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const deleteActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    await activityLogService.deleteActivity(id);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xóa activity log thành công",
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = {
  getAllActivityLogs,
  createActivity,
  deleteActivity,
};
