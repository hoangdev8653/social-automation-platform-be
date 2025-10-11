const { StatusCodes } = require("http-status-codes");
const mediaService = require("../services/media.js");

const getAllMedia = async (req, res, next) => {
  try {
    const media = await mediaService.getAllMedia();
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: media,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getMediaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const media = await mediaService.getMediaById(id);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: media,
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const createMedia = async (req, res, next) => {
  try {
    const data = req.body;
    const newMedia = await mediaService.createMedia(data);
    return res.status(StatusCodes.CREATED).json({
      status: 201,
      message: "Tạo media thành công",
      content: newMedia,
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const updateMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedMedia = await mediaService.updateMedia(id, data);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Cập nhật media thành công",
      content: updatedMedia,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const media = await mediaService.deleteMedia(id);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xóa media thành công",
      content: media,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  getAllMedia,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
};
