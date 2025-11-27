const { StatusCodes } = require("http-status-codes");
const postMediaService = require("../services/postMedia.js");

const getAllPostMedia = async (req, res, next) => {
  try {
    const postMedia = await postMediaService.getAllPostMedia();
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: postMedia,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getPostMediaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const postMedia = await postMediaService.getPostMediaById(id);
    return res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", content: postMedia });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const createPostMedia = async (req, res, next) => {
  try {
    const data = req.body; // Expect { post_id, media_id }
    const postMedia = await postMediaService.createPostMedia(data);
    return res.status(StatusCodes.CREATED).json({
      status: 201,
      message: "Tạo liên kết thành công",
      content: postMedia,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const updatePostMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const postMedia = await postMediaService.updatePostMedia(id, data);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Cập nhật thành công",
      content: postMedia,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const deletePostMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const postMedia = await postMediaService.deletePostMedia(id);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xóa liên kết thành công",
      content: postMedia,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  getAllPostMedia,
  getPostMediaById,
  createPostMedia,
  updatePostMedia,
  deletePostMedia,
};
