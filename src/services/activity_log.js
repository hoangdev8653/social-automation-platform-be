const db = require("../models");

const getAllActivityLogs = async ({ page = 1, limit = 10 }) => {
  try {
    const offset = (page - 1) * limit;
    const { count, rows } = await db.ActivityLog.findAndCountAll({
      offset,
      limit: parseInt(limit),
      order: [["createdAt", "DESC"]],
    });
    const totalPages = Math.ceil(count / limit);
    return {
      data: rows,
      totalPages,
      currentPage: parseInt(page),
    };
  } catch (error) {
    throw error;
  }
};

const createActivity = async (data) => {
  try {
    const newActivity = await db.ActivityLog.create(data);
    return newActivity;
  } catch (error) {
    throw error;
  }
};

const deleteActivity = async (id) => {
  try {
    await db.ActivityLog.destroy({ where: { id } });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllActivityLogs,
  createActivity,
  deleteActivity,
};
