const { StatusCodes } = require("http-status-codes");
const postTargetService = require("../services/postTarget.js");

const getAllPostTargets = async (req, res, next) => {
  try {
    const targets = await postTargetService.getAllPostTargets();
    res.status(StatusCodes.OK).json({
      status: 200,
      message: "Lấy danh sách mục tiêu đăng bài thành công.",
      content: targets,
    });
  } catch (error) {
    next(error);
  }
};

const createPostTarget = async (req, res, next) => {
  try {
    const data = req.body;
    const newTarget = await postTargetService.createPostTarget(data);
    return res.status(StatusCodes.CREATED).json({
      status: 201,
      message: "Tạo mục tiêu đăng bài thành công.",
      content: newTarget,
    });
  } catch (error) {
    next(error);
  }
};

const updatePostTarget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body; // { status, published_url }
    const updatedTarget = await postTargetService.updatePostTarget(id, data);
    res.status(StatusCodes.OK).json({
      status: 200,
      message: "Cập nhật mục tiêu đăng bài thành công.",
      content: updatedTarget,
    });
  } catch (error) {
    next(error);
  }
};

const deletePostTarget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await postTargetService.deletePostTarget(id);
    res.status(StatusCodes.OK).json({
      status: 200,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPostTargets,
  createPostTarget,
  updatePostTarget,
  deletePostTarget,
};
