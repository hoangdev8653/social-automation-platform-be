const { StatusCodes } = require("http-status-codes");
const postService = require("../services/post.js");
const ApiError = require("../utils/ApiError.js");

const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await postService.getPostById(id);
    return res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", content: post });
  } catch (error) {
    console.log(error);
  }
};

const createPost = async (req, res, next) => {
  try {
    const { caption, hashtags, socialAccountIds, scheduledTime } = req.body;
    const userId = req.userId;
    const files = req.files;
    let parsedSocialAccountIds;
    if (
      typeof socialAccountIds === "string" &&
      socialAccountIds.startsWith("[")
    ) {
      try {
        parsedSocialAccountIds = JSON.parse(socialAccountIds);
      } catch (e) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Trường socialAccountIds không đúng định dạng JSON."
        );
      }
    } else {
      parsedSocialAccountIds = Array.isArray(socialAccountIds)
        ? socialAccountIds
        : [socialAccountIds].filter(Boolean);
    }

    if (
      !parsedSocialAccountIds ||
      !Array.isArray(parsedSocialAccountIds) ||
      parsedSocialAccountIds.length === 0
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Vui lòng chọn ít nhất một tài khoản để đăng bài."
      );
    }

    if (!caption && (!files || files.length === 0)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Bài viết phải có nội dung hoặc media."
      );
    }

    const newPost = await postService.createPost({
      userId,
      caption,
      hashtags,
      scheduledTime,
      socialAccountIds: parsedSocialAccountIds,
      files,
    });

    return res.status(StatusCodes.CREATED).json({
      status: 201,
      message: "Tạo bài viết và lên lịch thành công!",
      content: newPost,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    next(error);
  }
};

const approvePost = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const adminId = req.userId;

    const approvedPost = await postService.approvePost({ postId, adminId });

    return res.status(StatusCodes.OK).json({
      status: 200,
      message: approvedPost.dataValues.message || "Duyệt bài viết thành công!",
      content: approvedPost,
    });
  } catch (error) {
    console.error("Error approving post:", error);
    next(error);
  }
};

const getPostByUser = async (req, res, next) => {
  try {
    const userId = req.userId;
    const post = await postService.getPostByUser(userId);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Lấy bài viết thành công!",
      content: post,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const rejectPost = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const { reason } = req.body;
    const adminId = req.userId;

    await postService.rejectPost({ postId, adminId, reason });

    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Từ chối bài viết thành công.",
    });
  } catch (error) {
    console.error("Error rejecting post:", error);
    next(error);
  }
};

const getAllPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const data = await postService.getAllPosts({ page, limit });
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Lấy danh sách bài viết thành công!",
      content: data.posts,
      totalPages: data.totalPages,
      currentPage: data.currentPage,
      totalItem: data.totalItem,
    });
  } catch (error) {
    console.error("Error getting all posts:", error);
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const result = await postService.deletePost(postId);

    return res.status(StatusCodes.OK).json({
      status: 200,
      message: result.message,
      content: null,
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    next(error);
  }
};

module.exports = {
  getPostById,
  createPost,
  approvePost,
  rejectPost,
  getAllPosts,
  getPostByUser,
  deletePost,
};
