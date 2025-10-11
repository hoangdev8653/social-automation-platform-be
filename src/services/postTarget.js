const db = require("../models");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

/**
 * Lấy tất cả các mục tiêu đăng bài
 */
const getAllPostTargets = async () => {
  try {
    const targets = await db.PostTargets.findAll({
      include: [
        {
          model: db.Post,
          attributes: ["id", "caption", "status"],
        },
        {
          model: db.SocialAccount,
          attributes: ["id", "account_name", "account_image"],
          include: {
            model: db.Platform,
            as: "platform",
            attributes: ["name", "image"],
          },
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    return targets;
  } catch (error) {
    throw error;
  }
};

/**
 * Tạo một mục tiêu đăng bài mới
 * Lưu ý: Chức năng này thường được gọi nội bộ khi tạo bài viết.
 * Việc tạo thủ công cần cẩn trọng.
 */
const createPostTarget = async (data) => {
  const { post_id, social_account_id } = data;
  // Kiểm tra sự tồn tại của post và social_account
  const post = await db.Post.findByPk(post_id);
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Bài viết không tồn tại.");
  }
  const account = await db.SocialAccount.findByPk(social_account_id);
  if (!account) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Tài khoản mạng xã hội không tồn tại."
    );
  }

  const newTarget = await db.PostTargets.create(data);
  return newTarget;
};

/**
 * Cập nhật một mục tiêu đăng bài (ví dụ: cập nhật status, published_url)
 */
const updatePostTarget = async (id, data) => {
  const target = await db.PostTargets.findByPk(id);
  if (!target) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Mục tiêu đăng bài không tồn tại."
    );
  }

  // Chỉ cho phép cập nhật một số trường nhất định
  const { status, published_url } = data;
  const updatedTarget = await target.update({ status, published_url });

  return updatedTarget;
};

/**
 * Xóa một mục tiêu đăng bài
 */
const deletePostTarget = async (id) => {
  const target = await db.PostTargets.findByPk(id);
  if (!target) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Mục tiêu đăng bài không tồn tại."
    );
  }

  await target.destroy();
  return { message: "Xóa mục tiêu đăng bài thành công." };
};

module.exports = {
  getAllPostTargets,
  createPostTarget,
  updatePostTarget,
  deletePostTarget,
};
