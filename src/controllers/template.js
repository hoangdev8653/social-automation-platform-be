const { StatusCodes } = require("http-status-codes");
const templateService = require("../services/template.js");

const getAllTemplate = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const data = await templateService.getAllTemplate({ page, limit });
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: data.template,
      totalPages: data.totalPages,
      currentPage: data.currentPage,
      totalItem: data.totalItem,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await templateService.getTemplateById(id);
    return res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", content: template });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const createTemplate = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { type, category_id, title, content } = req.body;
    const template = await templateService.createTemplate(userId, {
      type,
      category_id,
      title,
      content,
    });
    return res
      .status(StatusCodes.CREATED)
      .json({ status: 201, message: "Xử lý thành công", content: template });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, category_id, title, content } = req.body;
    const template = await templateService.updateTemplate(id, {
      type,
      category_id,
      title,
      content,
    });
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: template,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const template = await templateService.deleteTemplate(userId, { id });
    return res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", content: template });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  getAllTemplate,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
