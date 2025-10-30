const db = require("../models");
const { StatusCodes } = require("http-status-codes");
const ApiError = require("../utils/ApiError");

const getAllTemplate = async () => {
  try {
    const template = await db.Template.findAll({
      include: [
        {
          model: db.TemplateCategory,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    return template;
  } catch (error) {
    throw error;
  }
};

const getTemplateById = async (id) => {
  try {
    const template = await db.Template.findByPk(id, {
      include: [
        {
          model: db.TemplateCategory,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
    });
    if (!template) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tồn tại template.");
    }
    return template;
  } catch (error) {
    throw error;
  }
};

const createTemplate = async ({ type, category_id, title, content }) => {
  try {
    const template = await db.Template.create({
      type,
      category_id,
      title,
      content,
    });
    return template;
  } catch (error) {
    throw error;
  }
};

const updateTemplate = async (id, { type, category_id, title, content }) => {
  try {
    const template = await db.Template.findByPk(id);
    if (!template) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tồn tại template.");
    }
    const updated = await db.Template.update(
      {
        type,
        category_id,
        title,
        content,
      },
      { where: { id } }
    );
    return updated;
  } catch (error) {
    throw error;
  }
};

const deleteTemplate = async (id) => {
  try {
    const template = await db.Template.findByPk(id);
    if (!template) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tồn tại template.");
    }
    const deleted = await db.Template.destroy({ where: { id } });
    return deleted;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = {
  getAllTemplate,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
