const db = require("../models");
const { StatusCodes } = require("http-status-codes");
const ApiError = require("../utils/ApiError");

const getAllTemplate = async (paginationOptions) => {
  try {
    const page = parseInt(paginationOptions.page, 10);
    const limit = parseInt(paginationOptions.limit, 10);
    const offset = (page - 1) * limit;
    const { count: totalItem, rows: template } =
      await db.Template.findAndCountAll({
        offset: offset,
        limit: limit,
        distinct: true,
        col: "id",
        include: [
          {
            model: db.TemplateCategory,
            as: "category",
            attributes: ["id", "name"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
    const totalPages = Math.ceil(totalItem / limit);

    return {
      template,
      totalPages,
      currentPage: page,
      totalItem,
    };
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

const createTemplate = async (
  userId,
  { type, category_id, title, content }
) => {
  try {
    const template = await db.Template.create({
      type,
      category_id,
      title,
      content,
    });
    await db.ActivityLog.create({
      user_id: userId,
      action: "Tạo mới Template",
      targetId: template.id,
      targetType: "TEMPLATE",
      details: `Tạo mới template với tiêu đề: ${title}`,
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

const deleteTemplate = async (userId, { id }) => {
  try {
    const template = await db.Template.findByPk(id);
    if (!template) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tồn tại template.");
    }
    const deleted = await db.Template.destroy({ where: { id } });
    await db.ActivityLog.create({
      user_id: userId,
      action: "Xóa Template",
      targetId: template.id,
      targetType: "TEMPLATE",
      details: `Xóa template với tiêu đề: ${template.title}`,
    });
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
