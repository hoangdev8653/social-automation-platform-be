const { StatusCodes } = require("http-status-codes");
const templateService = require("../services/template.js");

const getAllTemplate = async (req, res, next) => {
  try {
    const template = await templateService.getAllTemplate();
    return res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", content: template });
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
    const { type, category_id, title, content } = req.body;
    const template = await templateService.createTemplate({
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
    const template = await templateService.deleteTemplate(id);
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
