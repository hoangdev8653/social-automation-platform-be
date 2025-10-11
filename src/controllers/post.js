const { StatusCodes } = require("http-status-codes");
const postService = require("../services/post.js");
const ApiError = require("../utils/ApiError.js");

const createPost = async (req, res, next) => {
  try {
    // Dữ liệu từ body: caption, hashtags, mảng các ID của social account
    const { caption, hashtags, socialAccountIds, scheduledTime } = req.body;

    // Lấy user_id từ middleware xác thực token
    const userId = req.userId;
    console.log(userId);

    // Files được upload (từ multer chẳng hạn)
    const files = req.files;

    // Chuyển đổi socialAccountIds từ string (nếu có) sang mảng TRƯỚC KHI KIỂM TRA
    let parsedSocialAccountIds;
    try {
      parsedSocialAccountIds =
        typeof socialAccountIds === "string"
          ? JSON.parse(socialAccountIds)
          : socialAccountIds;
    } catch (e) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Trường socialAccountIds không đúng định dạng JSON."
      );
    }

    // Kiểm tra dữ liệu đầu vào
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

    // Gọi service để xử lý logic
    const newPost = await postService.createPost({
      userId,
      caption,
      hashtags,
      scheduledTime,
      socialAccountIds: parsedSocialAccountIds,
      files, // mảng các file đã upload
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
    const adminId = req.userId; // Lấy ID của admin từ token

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

const getAllPosts = async (req, res, next) => {
  try {
    const posts = await postService.getAllPosts();
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Lấy danh sách bài viết thành công!",
      content: posts,
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
  createPost,
  approvePost,
  getAllPosts,
  deletePost,
};
