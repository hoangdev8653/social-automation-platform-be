const { StatusCodes } = require("http-status-codes");
const templateCategoryService = require("../services/templatecategory.js");

const getAllTemplateCategory = async (req, res, next) => {
  try {
    const templateCategory =
      await templateCategoryService.getAllTemplateCategory();
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: templateCategory,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getTemplateCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const templateCategory =
      await templateCategoryService.getTemplateCategoryById(id);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: templateCategory,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const createTemplateCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const templateCategory =
      await templateCategoryService.createTemplateCategory({ name });
    return res.status(StatusCodes.CREATED).json({
      status: 201,
      message: "Xử lý thành công",
      content: templateCategory,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const deleteTemplateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const templateCategory =
      await templateCategoryService.deleteTemplateCategory(id);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: templateCategory,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  getAllTemplateCategory,
  getTemplateCategoryById,
  createTemplateCategory,
  deleteTemplateCategory,
};
