const analyticsService = require("../services/analytics.js");
const { StatusCodes } = require("http-status-codes");

const getAnalyticOverview = async (req, res, next) => {
  try {
    const data = await analyticsService.getAnalyticOverview();
    return res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", content: data });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getAllPostsEngagement = async (req, res, next) => {
  try {
    const data = await analyticsService.getAllPostsEngagement();
    return res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", content: data });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  getAnalyticOverview,
  getAllPostsEngagement,
};
