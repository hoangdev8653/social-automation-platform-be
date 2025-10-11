const db = require("../models");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const getAllPostMedia = async () => {
  try {
    const postMedia = await db.PostMedia.findAll();
    return postMedia;
  } catch (error) {
    throw error;
  }
};

const getPostMediaById = async (id) => {
  try {
    const postMedia = await db.PostMedia.findByPk(id);
    if (!postMedia) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Liên kết media và bài viết không tồn tại."
      );
    }
    return postMedia;
  } catch (error) {
    throw error;
  }
};

const createPostMedia = async (data) => {
  const { post_id, media_id } = data;
  try {
    // Kiểm tra xem post và media có tồn tại không
    const post = await db.Post.findByPk(post_id);
    if (!post) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Bài viết không tồn tại.");
    }
    const media = await db.Media.findByPk(media_id);
    if (!media) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Media không tồn tại.");
    }

    const postMedia = await db.PostMedia.create({ post_id, media_id });
    return postMedia;
  } catch (error) {
    throw error;
  }
};

const updatePostMedia = async (id, data) => {
  // Bảng PostMedia chỉ có post_id và media_id, việc update thường không cần thiết.
  // Thông thường sẽ là xóa và tạo mới. Tuy nhiên, nếu cần, có thể impl như sau.
  throw new ApiError(
    StatusCodes.NOT_IMPLEMENTED,
    "Chức năng cập nhật không được hỗ trợ. Vui lòng xóa và tạo mới."
  );
};

const deletePostMedia = async (id) => {
  try {
    const postMedia = await db.PostMedia.findByPk(id);
    if (!postMedia) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Liên kết media và bài viết không tồn tại."
      );
    }
    return await postMedia.destroy();
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllPostMedia,
  getPostMediaById,
  createPostMedia,
  updatePostMedia,
  deletePostMedia,
};
