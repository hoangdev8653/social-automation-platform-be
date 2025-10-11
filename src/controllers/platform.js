const { StatusCodes } = require("http-status-codes");
const platformService = require("../services/platform.js");

const getAllPlatform = async (req, res, next) => {
  try {
    const platforms = await platformService.getAllPlatform();
    res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", data: platforms });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getPlatformById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const platform = await platformService.getPlatformById(id);
    res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", data: platform });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const createPlatform = async (req, res, next) => {
  try {
    const { name } = req.body;
    const fileData = req.file;

    if (!fileData) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Vui lòng tải lên một hình ảnh." });
    }

    const platform = await platformService.createPlatform({
      name,
      image: fileData.path,
    });
    res
      .status(StatusCodes.CREATED)
      .json({ status: 201, message: "Tạo thành công", data: platform });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const updatePlatform = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const fileData = req.file;

    const dataToUpdate = { name };
    if (fileData) {
      dataToUpdate.image = fileData.path;
    }
    const platform = await platformService.updatePlatform(id, dataToUpdate);
    res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Cập nhật thành công", data: platform });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const deletePlatform = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await platformService.deletePlatform(id);
    res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xóa thành công", data: result });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  getAllPlatform,
  getPlatformById,
  createPlatform,
  updatePlatform,
  deletePlatform,
};
