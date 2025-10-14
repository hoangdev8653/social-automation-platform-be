const db = require("../models");

const getAllTemplateCategory = async () => {
  try {
    const templateCategory = await db.TemplateCategory.findAll();
    return templateCategory;
  } catch (error) {
    throw error;
  }
};

const getTemplateCategoryById = async (id) => {
  try {
    const templateCategory = await db.TemplateCategory.findByPk(id);
    if (!templateCategory) {
      throw new Error("Không tồn tại Template Category");
    }
    return templateCategory;
  } catch (error) {
    throw error;
  }
};

const createTemplateCategory = async ({ name }) => {
  try {
    const templateCategory = await db.TemplateCategory.create({ name });
    return templateCategory;
  } catch (error) {
    throw error;
  }
};

const deleteTemplateCategory = async (id) => {
  const templateCategory = db.TemplateCategory.findByPk(id);
  if (!templateCategory) {
    throw new Error("Không tồn tại Template Category");
  }
  const deleted = await db.TemplateCategory.destroy({ where: { id } });
  return deleted;
};

module.exports = {
  getAllTemplateCategory,
  getTemplateCategoryById,
  createTemplateCategory,
  deleteTemplateCategory,
};
