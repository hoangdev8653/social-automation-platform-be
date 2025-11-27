const db = require("../models");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const getAllPostTargets = async (paginationOptions) => {
  try {
    const page = parseInt(paginationOptions.page, 10);
    const limit = parseInt(paginationOptions.limit, 10);
    const offset = (page - 1) * limit;
    const { count: totalItem, rows: post } =
      await db.PostTargets.findAndCountAll({
        offset: offset,
        limit: limit,
        distinct: true,
        col: "id",
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

    const totalPages = Math.ceil(totalItem / limit);

    return {
      post,
      totalPages,
      currentPage: page,
      totalItem,
    };
  } catch (error) {
    throw error;
  }
};

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
