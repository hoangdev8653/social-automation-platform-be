const {
  Post,
  Media,
  PostTargets,
  sequelize,
  User,
  SocialAccount, // Thêm SocialAccount
  Platform, // Thêm Platform
  PostMedia,
  Notification, // Import model Notification
} = require("../models");
const ApiError = require("../utils/ApiError");
const { deleteFromCloud } = require("../middlewares/cloudinary");
const { StatusCodes } = require("http-status-codes");
const { publishToSocialMedia } = require("./publisher"); // Giả định service này tồn tại

const getPostById = async (id) => {
  try {
    const post = await Post.findByPk(id, {
      include: [
        {
          model: Media, // Sửa lỗi: Alias sai
          as: "media", // Alias đúng là "media" theo model/post.js
          attributes: ["id", "type", "url"],
          through: { attributes: [] }, // Không lấy thông tin từ bảng trung gian PostMedia
        },
        {
          model: User,
          as: "author", // Alias đúng là "author" theo model/post.js
          attributes: ["id", "name", "email"],
        },
        // Nếu bạn muốn lấy cả các target (social accounts) thì thêm include ở đây
      ],
      order: [["createdAt", "DESC"]],
    });
    if (!post) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bài viết.");
    }
    return post;
  } catch (error) {
    throw error;
  }
};

const createPost = async (data) => {
  const { userId, caption, hashtags, scheduledTime, socialAccountIds, files } =
    data;

  // Bắt đầu một Transaction
  const t = await sequelize.transaction();

  try {
    // BƯỚC 1: Tạo bản ghi Post để lấy `post_id`
    // Tất cả các thao tác create/bulkCreate bên dưới đều có `{ transaction: t }`
    // để đảm bảo chúng thuộc cùng một giao dịch.
    const newPost = await Post.create(
      {
        user_id: userId,
        caption,
        hashtags,
        scheduled_time: scheduledTime,
        status: scheduledTime ? "scheduled" : "draft", // Nếu có lịch thì chuyển status
      },
      { transaction: t }
    );

    // BƯỚC 2: Xử lý và liên kết Media (nếu có)
    if (files && files.length > 0) {
      const mediaToCreate = [];
      for (const file of files) {
        mediaToCreate.push({
          type: file.mimetype.startsWith("image") ? "image" : "video",
          url: file.path, // Lấy URL trực tiếp từ kết quả của middleware `uploadCloud`
          metadata: { size: file.size, filename: file.filename },
        });
      }
      const createdMedia = await Media.bulkCreate(mediaToCreate, {
        transaction: t,
      });

      // Liên kết media với post
      const postMediaToCreate = createdMedia.map((media) => ({
        post_id: newPost.id,
        media_id: media.id,
      }));
      await PostMedia.bulkCreate(postMediaToCreate, { transaction: t });
    }

    // BƯỚC 3: Tạo các bản ghi PostTargets
    const postTargetsToCreate = socialAccountIds.map((accountId) => ({
      post_id: newPost.id,
      social_account_id: accountId,
      status: "pending",
    }));
    await PostTargets.bulkCreate(postTargetsToCreate, { transaction: t });

    // Nếu tất cả thành công, commit transaction
    await t.commit();
    return newPost; // Trả về bài post vừa tạo
  } catch (error) {
    // Nếu có bất kỳ lỗi nào, rollback tất cả các thay đổi
    await t.rollback();
    console.error("Failed to create post:", error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Tạo bài viết thất bại."
    );
  }
};

const approvePost = async (data) => {
  const { postId, adminId } = data;
  // Bắt đầu một transaction lớn cho cả quá trình duyệt và đăng
  const t = await sequelize.transaction();
  try {
    const post = await Post.findByPk(postId, { transaction: t });

    if (!post) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bài viết.");
    }

    if (["approved", "publishing"].includes(post.status)) {
      post.dataValues.message = `Bài viết đã được duyệt và đang trong hàng đợi xử lý (trạng thái: ${post.status}).`;
      await t.commit(); // Vẫn commit vì không có lỗi, chỉ là không làm gì thêm
      return post;
    }

    if (!["draft", "pending_approval", "failed"].includes(post.status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể duyệt bài viết đang ở trạng thái '${post.status}'.`
      );
    }

    const newStatus = post.scheduled_time ? "scheduled" : "approved";

    post.status = newStatus;
    post.approved_by = adminId;
    post.approved_at = new Date();
    await post.save({ transaction: t });

    // TẠO THÔNG BÁO CHO NGƯỜI DÙNG
    // Lấy một đoạn caption ngắn để hiển thị trong thông báo
    const postSnippet = post.caption
      ? post.caption.substring(0, 50) + "..."
      : "không có tiêu đề";
    const a = await Notification.create(
      {
        user_id: post.user_id, // ID của người tạo bài viết
        type: "post_approved",
        message: `Bài viết "${postSnippet}" của bạn đã được duyệt.`,
        related_entity_id: post.id,
        related_entity_type: "post",
      },
      { transaction: t }
    );

    if (newStatus === "approved") {
      // Gọi hàm đăng bài ngay bên trong transaction này
      await publishPost(postId, t);
    }

    await t.commit();
    return post;
  } catch (error) {
    await t.rollback();
    // Ném lỗi ra ngoài để controller có thể bắt
    throw error;
  }
};

const getPostByUser = async (userId) => {
  try {
    const posts = await Post.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Media, // Sửa lỗi: Alias sai
          as: "media", // Alias đúng là "media" theo model/post.js
          attributes: ["id", "type", "url"],
          through: { attributes: [] }, // Không lấy thông tin từ bảng trung gian PostMedia
        },
        {
          model: User,
          as: "author", // Alias đúng là "author" theo model/post.js
          attributes: ["id", "name", "email"],
        },
        // Nếu bạn muốn lấy cả các target (social accounts) thì thêm include ở đây
      ],
    });
    return posts;
  } catch (error) {
    throw error;
  }
};

const rejectPost = async (data) => {
  const { postId, adminId, reason } = data;
  const t = await sequelize.transaction();
  try {
    const post = await Post.findByPk(postId, {
      include: [{ model: Media, as: "media", through: { attributes: [] } }],
      transaction: t,
    });

    if (!post) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bài viết.");
    }

    // Chỉ cho phép từ chối bài viết đang chờ duyệt
    if (post.status !== "pending_approval" && post.status !== "draft") {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể từ chối bài viết đang ở trạng thái '${post.status}'.`
      );
    }

    // Cập nhật trạng thái và lý do từ chối
    post.status = "rejected";
    post.rejected_reason = reason || "Không có lý do cụ thể.";
    await post.save({ transaction: t });

    // Gửi thông báo cho người dùng
    const postSnippet = post.caption
      ? post.caption.substring(0, 20) + "..."
      : "không có tiêu đề";
    await Notification.create(
      {
        user_id: post.user_id,
        type: "post_rejected",
        message: `Bài viết "${postSnippet}" của bạn đã bị từ chối. Lý do: ${post.rejected_reason}`,
        related_entity_id: post.id,
        related_entity_type: "post",
      },
      { transaction: t }
    );

    await t.commit();
    return post;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const getAllPosts = async () => {
  try {
    const posts = await Post.findAll({
      include: [
        {
          model: Media, // Sửa lỗi: Alias sai
          as: "media", // Alias đúng là "media" theo model/post.js
          attributes: ["id", "type", "url"],
          through: { attributes: [] }, // Không lấy thông tin từ bảng trung gian PostMedia
        },
        {
          model: User,
          as: "author", // Alias đúng là "author" theo model/post.js
          attributes: ["id", "name", "email"],
        },
        // Nếu bạn muốn lấy cả các target (social accounts) thì thêm include ở đây
      ],
      order: [["createdAt", "DESC"]], // Sắp xếp bài viết mới nhất lên đầu
    });
    return posts;
  } catch (error) {
    console.error("Failed to get all posts:", error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lấy danh sách bài viết thất bại."
    );
  }
};

const deletePost = async (postId) => {
  const t = await sequelize.transaction();
  try {
    const post = await Post.findByPk(postId, {
      include: [{ model: Media, as: "media", through: { attributes: [] } }],
      transaction: t,
    });

    if (!post) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bài viết.");
    }

    // Xóa media liên quan trên Cloudinary trước khi xóa trong DB
    if (post.media && post.media.length > 0) {
      const mediaIds = post.media.map((m) => m.id);

      for (const media of post.media) {
        const publicId = media.metadata?.filename;
        if (publicId) deleteFromCloud(publicId);
      }

      // Xóa các bản ghi trong bảng Media và liên kết trong PostMedia
      await PostMedia.destroy({ where: { post_id: postId }, transaction: t });
      await Media.destroy({ where: { id: mediaIds }, transaction: t });
    }

    await post.destroy({ transaction: t });
    await t.commit();
    return { message: "Xóa bài viết thành công." };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Lấy thông tin chi tiết của một bài viết và bắt đầu quá trình đăng bài.
 * Hàm này có thể được gọi ngay sau khi duyệt hoặc bởi một cron job cho các bài viết được lên lịch.
 * @param {string} postId ID của bài viết cần đăng
 */
const publishPost = async (postId, existingTransaction = null) => {
  // Hàm này có thể tự tạo transaction hoặc sử dụng transaction đã có
  const t = existingTransaction || (await sequelize.transaction());
  try {
    // Reset lại trạng thái của các target thành 'pending'.
    // Reset lại trạng thái của các target đã thất bại ('failed') thành 'pending'.
    // Điều này đảm bảo rằng khi admin "thử lại" một bài viết đã 'failed',
    // tất cả các target sẽ được đưa vào hàng đợi xử lý lại từ đầu.
    // các target thất bại trước đó sẽ được đưa vào hàng đợi xử lý lại.
    await PostTargets.update(
      { status: "pending", error_message: null, published_url: null },
      { where: { post_id: postId, status: "failed" }, transaction: t }
    );

    // Lấy thông tin post, bao gồm media và các tài khoản social cần đăng
    // Sequelize sẽ tự động tìm các PostTargets có status 'pending' do điều kiện where
    const postToPublish = await Post.findByPk(postId, {
      include: [
        { model: Media, as: "media", through: { attributes: [] } },
        {
          model: PostTargets,
          as: "postTargets", // Sửa lỗi: Alias không chính xác. Sequelize thường dùng camelCase hoặc alias đã định nghĩa.
          where: { status: "pending" }, // Chỉ lấy các target chưa được xử lý
          include: [
            // Sửa lỗi: Thêm include SocialAccount để lấy access_token và page_id
            {
              model: SocialAccount,
              attributes: ["id", "account_id", "access_token"],
              // Sửa lỗi: Platform phải được include bên trong SocialAccount
              include: [
                {
                  model: Platform,
                  as: "platform",
                  attributes: ["name"],
                },
              ],
            },
          ],
        },
      ],
      transaction: t, // Sửa lỗi: transaction phải là một phần của object options
    });

    if (
      !postToPublish ||
      !postToPublish.postTargets ||
      postToPublish.postTargets.length === 0
    ) {
      console.log(
        `Post ${postId} không tìm thấy hoặc không có target nào để đăng.`
      );
      // Nếu đang dùng transaction từ bên ngoài, không commit ở đây
      if (!existingTransaction) await t.commit();
      return;
    }

    // Cập nhật trạng thái post thành 'publishing'
    postToPublish.status = "publishing";
    await postToPublish.save({ transaction: t });

    // Hàm này sẽ lặp qua từng `postToPublish.postTargets` và gọi API tương ứng
    await publishToSocialMedia(postToPublish, t);

    // Nếu đang dùng transaction từ bên ngoài, không commit ở đây
    if (!existingTransaction) await t.commit();
  } catch (error) {
    // Nếu đang dùng transaction từ bên ngoài, không rollback ở đây
    if (!existingTransaction) await t.rollback();
    console.error(`Lỗi khi đăng bài (Post ID: ${postId}):`, error);
    // Cập nhật trạng thái post thành 'failed' để có thể thử lại sau
    // Việc ném lỗi ra sẽ khiến transaction bên ngoài rollback và xử lý lỗi
    if (existingTransaction) {
      throw error; // Ném lỗi để transaction cha xử lý
    } else {
      await Post.update({ status: "failed" }, { where: { id: postId } });
    }
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
  publishPost,
};
