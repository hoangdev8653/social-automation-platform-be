const db = require("../models");
const ApiError = require("../utils/ApiError");

const getAllPlatform = async () => {
  try {
    const platforms = await db.Platform.findAll();
    return platforms;
  } catch (error) {
    throw error;
  }
};

const getPlatformById = async (id) => {
  try {
    const platform = await db.Platform.findByPk(id);
    if (!platform) {
      throw new ApiError(404, "Nền tảng không tồn tại");
    }
    return platform;
  } catch (error) {
    throw error;
  }
};

const createPlatform = async ({ name, image }) => {
  try {
    const platform = await db.Platform.create({ name, image });
    return platform;
  } catch (error) {
    throw error;
  }
};

const updatePlatform = async (id, { name, image }) => {
  try {
    const platform = await db.Platform.findByPk(id);
    if (!platform) {
      throw new ApiError(404, "Nền tảng không tồn tại");
    }
    const updatedPlatform = await db.Platform.update(
      { name, image },
      { where: { id } }
    );
    return updatedPlatform;
  } catch (error) {
    throw error;
  }
};

const deletePlatform = async (id) => {
  try {
    const platform = await db.Platform.findByPk(id);
    if (!platform) {
      throw new ApiError(404, "Nền tảng không tồn tại");
    }
    const deleted = await db.Platform.destroy({ where: { id } });
    return deleted;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllPlatform,
  getPlatformById,
  createPlatform,
  updatePlatform,
  deletePlatform,
};
