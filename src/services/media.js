const db = require("../models");

const getAllMedia = async () => {
  try {
    const media = await db.Media.findAll();
    return media;
  } catch (error) {
    throw error;
  }
};

const getMediaById = async (id) => {
  try {
    const media = await db.Media.findByPk(id);
    return media;
  } catch (error) {
    throw error;
  }
};

const createMedia = async (data) => {
  try {
    const newMedia = await db.Media.create(data);
    return newMedia;
  } catch (error) {
    throw error;
  }
};

const updateMedia = async (id, data) => {
  try {
    const media = await db.Media.findByPk(id);
    if (!media) {
      throw new Error("Media not found");
    }
    const updatedMedia = await media.update(data);
    return updatedMedia;
  } catch (error) {
    throw error;
  }
};

const deleteMedia = async (id) => {
  try {
    const media = await db.Media.findByPk(id);
    if (!media) {
      throw new Error("Media not found");
    }
    const deleted = await media.destroy();
    return deleted;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllMedia,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
};
