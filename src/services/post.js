const {
  Post,
  Media,
  PostTargets,
  sequelize,
  User,
  SocialAccount,
  Platform,
  PostMedia,
  Notification,
  Sequelize,
  ActivityLog,
} = require("../models");
const ApiError = require("../utils/ApiError");
const { deleteFromCloud } = require("../middlewares/cloudinary");
const { StatusCodes } = require("http-status-codes");
const { publishToSocialMedia } = require("./publisher");

const getPostById = async (id) => {
  try {
    const post = await Post.findByPk(id, {
      include: [
        {
          model: Media,
          as: "media",
          attributes: ["id", "type", "url"],
          through: { attributes: [] },
        },
        {
          model: User,
          as: "author",
          attributes: ["id", "name", "email"],
        },
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

  const t = await sequelize.transaction();

  try {
    const initialStatus = scheduledTime ? "pending_approval" : "draft";
    const newPost = await Post.create(
      {
        user_id: userId,
        caption,
        hashtags,
        scheduled_time: scheduledTime,
        status: initialStatus,
      },
      { transaction: t }
    );

    if (files && files.length > 0) {
      const mediaToCreate = [];
      for (const file of files) {
        mediaToCreate.push({
          type: file.mimetype.startsWith("image") ? "image" : "video",
          url: file.path,
          metadata: { size: file.size, filename: file.filename },
        });
      }
      const createdMedia = await Media.bulkCreate(mediaToCreate, {
        transaction: t,
      });

      const postMediaToCreate = createdMedia.map((media) => ({
        post_id: newPost.id,
        media_id: media.id,
      }));
      await PostMedia.bulkCreate(postMediaToCreate, { transaction: t });
    }

    const postTargetsToCreate = socialAccountIds.map((accountId) => ({
      post_id: newPost.id,
      social_account_id: accountId,
      status: "pending",
    }));
    await PostTargets.bulkCreate(postTargetsToCreate, { transaction: t });

    await t.commit();

    try {
      const captionSnippet = newPost.caption
        ? `${newPost.caption.substring(0, 30)}...`
        : "(Không có caption)";
      await ActivityLog.create({
        user_id: userId,
        action: "Tạo bài viết",
        target_id: newPost.id,
        target_type: "post",
        details: `Nhân viên tạo bài viết "${captionSnippet}" và chuyển sang trạng thái chờ duyệt.`,
      });
    } catch (logError) {
      console.error("Ghi log hoạt động thất bại:", logError);
    }

    return newPost;
  } catch (error) {
    await t.rollback();

    try {
      await ActivityLog.create({
        user_id: userId,
        action: "Tạo bài viết thất bại",
        target_type: "post",
        details: `Tạo bài viết thất bại. Lỗi: ${error.message}`,
      });
    } catch (logError) {
      console.error("Ghi log cho lỗi tạo bài viết cũng thất bại:", logError);
    }

    console.error("Failed to create post:", error);

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Tạo bài viết thất bại."
    );
  }
};

const approvePost = async (data) => {
  const { postId, adminId } = data;
  const t = await sequelize.transaction();
  try {
    const post = await Post.findByPk(postId, { transaction: t });

    if (!post) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bài viết.");
    }

    if (["approved", "publishing", "scheduled"].includes(post.status)) {
      post.dataValues.message = `Bài viết đã được duyệt và đang trong hàng đợi xử lý (trạng thái: ${post.status}).`;
      await t.commit();
      return post;
    }

    if (
      !["draft", "pending_approval", "failed", "missed_schedule"].includes(
        post.status
      )
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể duyệt bài viết đang ở trạng thái '${post.status}'.`
      );
    }

    const postSnippet = post.caption
      ? post.caption.substring(0, 50) + "..."
      : "không có tiêu đề";

    const now = new Date();
    const isScheduledInFuture =
      post.scheduled_time && post.scheduled_time > now;
    let newStatus;
    let notificationMessage;
    let notificationType = "post_approved";

    if (isScheduledInFuture) {
      newStatus = "scheduled";
      notificationMessage = `Bài viết "${postSnippet}" của bạn đã được duyệt và sẽ được đăng vào lúc ${post.scheduled_time}.`;
    } else if (post.scheduled_time) {
      newStatus = "missed_schedule";
      notificationMessage = `Bài viết "${postSnippet}" đã được duyệt nhưng bị lỡ lịch. Vui lòng đặt lại thời gian đăng.`;
      notificationType = "post_missed_schedule";
    } else {
      newStatus = "approved";
      notificationMessage = `Bài viết "${postSnippet}" của bạn đã được duyệt và đang được đăng.`;
    }

    post.status = newStatus;
    post.approved_by = adminId;
    post.approved_at = new Date();
    await post.save({ transaction: t });

    if (["scheduled", "missed_schedule"].includes(newStatus)) {
      await PostTargets.update(
        { status: newStatus },
        { where: { post_id: post.id }, transaction: t }
      );
    }

    await Notification.create(
      {
        user_id: post.user_id,
        type: notificationType,
        message: notificationMessage,
        related_entity_id: post.id,
        related_entity_type: "post",
      },
      { transaction: t }
    );

    if (newStatus === "scheduled") {
      await ActivityLog.create(
        {
          user_id: adminId,
          action: "Lên lịch bài viết",
          target_id: post.id,
          target_type: "post",
          details: `Bài viết "${postSnippet}" đã được duyệt và lên lịch đăng vào lúc ${post.scheduled_time}.`,
        },
        { transaction: t }
      );
    } else if (newStatus === "approved") {
      try {
        await publishPost(postId, t);
        await ActivityLog.create(
          {
            user_id: adminId,
            action: "Bắt đầu đăng bài",
            target_id: post.id,
            target_type: "post",
            details: `Bài viết "${postSnippet}" đã được duyệt và bắt đầu quá trình đăng.`,
          },
          { transaction: t }
        );
      } catch (publishError) {
        publishError.post = post;
        throw publishError;
      }
    }

    await t.commit();
    return post;
  } catch (error) {
    await t.rollback();

    try {
      const postSnippet = error.post?.caption
        ? `${error.post.caption.substring(0, 50)}...`
        : `(ID: ${postId})`;
      await ActivityLog.create({
        user_id: adminId,
        action: "Đăng bài thất bại",
        target_id: postId,
        target_type: "post",
        details: `Duyệt hoặc đăng bài viết "${postSnippet}" thất bại. Lỗi: ${error.message}`,
      });
    } catch (logError) {
      console.error("Ghi log lỗi duyệt bài cũng thất bại:", logError);
    }

    throw error;
  }
};

const getPostByUser = async (userId) => {
  try {
    const posts = await Post.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Media,
          as: "media",
          attributes: ["id", "type", "url"],
          through: { attributes: [] },
        },
        {
          model: User,
          as: "author",
          attributes: ["id", "name", "email"],
        },
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

    if (!["pending_approval", "draft"].includes(post.status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể từ chối bài viết đang ở trạng thái '${post.status}'.`
      );
    }

    post.status = "rejected";
    post.rejected_reason = reason || "Không có lý do cụ thể.";
    await post.save({ transaction: t });

    await PostTargets.update(
      { status: "rejected" },
      { where: { post_id: post.id }, transaction: t }
    );

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

    try {
      await ActivityLog.create(
        {
          user_id: adminId,
          action: "Từ chối bài viết",
          target_id: post.id,
          target_type: "post",
          details: `Admin đã từ chối bài viết "${postSnippet}". Lý do: ${post.rejected_reason}`,
        },
        { transaction: t }
      );
    } catch (logError) {
      console.error("Ghi log từ chối bài thất bại:", logError);
    }

    await t.commit();
    return post;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const getAllPosts = async (paginationOptions) => {
  try {
    const page = parseInt(paginationOptions.page, 10);
    const limit = parseInt(paginationOptions.limit, 10);
    const offset = (page - 1) * limit;
    const { count: totalItem, rows: posts } = await Post.findAndCountAll({
      offset: offset,
      limit: limit,
      distinct: true,
      col: "id",
      include: [
        {
          model: Media,
          as: "media",
          attributes: ["id", "type", "url"],
          through: { attributes: [] },
        },
        {
          model: User,
          as: "author",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    const totalPages = Math.ceil(totalItem / limit);

    return {
      posts,
      totalPages,
      currentPage: page,
      totalItem,
    };
  } catch (error) {
    console.error("Failed to get all posts:", error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lấy danh sách bài viết thất bại."
    );
  }
};

const deletePost = async (postId, deletedByUserId) => {
  const t = await sequelize.transaction();
  try {
    const post = await Post.findByPk(postId, {
      include: [{ model: Media, as: "media", through: { attributes: [] } }],
      transaction: t,
    });

    if (!post) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bài viết.");
    }

    if (post.media && post.media.length > 0) {
      const mediaIds = post.media.map((m) => m.id);

      for (const media of post.media) {
        const publicId = media.metadata?.filename;
        if (publicId) deleteFromCloud(publicId);
      }

      await PostMedia.destroy({ where: { post_id: postId }, transaction: t });
      await Media.destroy({ where: { id: mediaIds }, transaction: t });
    }

    await post.destroy({ transaction: t });

    try {
      const captionSnippet = post.caption
        ? `${post.caption.substring(0, 50)}...`
        : "(Không có caption)";
      await ActivityLog.create({
        user_id: deletedByUserId,
        action: "Xóa bài viết",
        target_id: postId,
        target_type: "post",
        details: `Đã xóa bài viết "${captionSnippet}".`,
      });
    } catch (logError) {
      console.error("Ghi log xóa bài viết thất bại:", logError);
    }

    await t.commit();
    return { message: "Xóa bài viết thành công." };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const publishPost = async (postId, existingTransaction = null) => {
  const t = existingTransaction || (await sequelize.transaction());
  try {
    await PostTargets.update(
      { status: "pending", error_message: null, published_url: null },
      { where: { post_id: postId, status: "failed" }, transaction: t }
    );

    const postToPublish = await Post.findByPk(postId, {
      include: [
        { model: Media, as: "media", through: { attributes: [] } },
        {
          model: PostTargets,
          as: "postTargets",
          where: {
            status: { [Sequelize.Op.in]: ["pending", "scheduled", "approved"] },
          },
          include: [
            {
              model: SocialAccount,
              attributes: [
                "id",
                "account_name",
                "account_id",
                "access_token",
                "refresh_token",
              ],
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
      transaction: t,
    });

    if (
      !postToPublish ||
      !postToPublish.postTargets ||
      postToPublish.postTargets.length === 0
    ) {
      console.log(
        `Post ${postId} không tìm thấy hoặc không có target nào để đăng.`
      );
      if (!existingTransaction) await t.commit();
      return;
    }

    postToPublish.status = "publishing";
    await postToPublish.save({ transaction: t });

    await publishToSocialMedia(postToPublish, t);

    await PostTargets.update(
      { status: "published", published_at: new Date() },
      {
        where: { post_id: postId, status: { [Sequelize.Op.ne]: "failed" } },
        transaction: t,
      }
    );

    postToPublish.status = "published";
    await postToPublish.save({ transaction: t });

    if (!existingTransaction) await t.commit();
  } catch (error) {
    if (!existingTransaction) await t.rollback();
    console.error(`Lỗi khi đăng bài (Post ID: ${postId}):`, error);

    if (existingTransaction) {
      throw error;
    } else {
      await Post.update({ status: "failed" }, { where: { id: postId } });
      await PostTargets.update(
        { status: "failed", error_message: error.message },
        { where: { post_id: postId } }
      );
    }
  }
};

const reschedulePost = async (data) => {
  const { postId, newScheduledTime, userId } = data;

  const t = await sequelize.transaction();

  try {
    const post = await Post.findByPk(postId, { transaction: t });

    if (!post) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bài viết.");
    }

    if (post.user_id !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền sửa bài viết này."
      );
    }

    if (!["missed_schedule"].includes(post.status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể đặt lại lịch cho bài viết có trạng thái '${post.status}'.`
      );
    }

    const scheduledDate = new Date(newScheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Thời gian không hợp lệ.");
    }
    if (scheduledDate <= new Date()) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Thời gian lên lịch phải lớn hơn thời gian hiện tại."
      );
    }

    const newStatus =
      post.status === "missed_schedule" ? "scheduled" : "pending_approval";

    post.scheduled_time = newScheduledTime;
    post.status = newStatus;
    await post.save({ transaction: t });

    await PostTargets.update(
      { status: newStatus },
      { where: { post_id: postId }, transaction: t }
    );

    try {
      await ActivityLog.create(
        {
          user_id: userId,
          action: "Đặt lại lịch",
          target_id: post.id,
          target_type: "post",
          details: `Đã đặt lại lịch sang ${newScheduledTime}. Trạng thái mới: ${newStatus}.`,
        },
        { transaction: t }
      );
    } catch (logError) {
      console.error("Ghi log đặt lại lịch thất bại:", logError);
    }

    await t.commit();
    return post;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const processScheduledPostsToPublish = async () => {
  const now = new Date();
  const postsToPublish = await Post.findAll({
    where: {
      status: "scheduled",
      scheduled_time: {
        [Sequelize.Op.lte]: now,
      },
    },
    attributes: ["id"],
  });

  if (postsToPublish.length === 0) {
    console.log("[Scheduler] Không có bài viết nào đến lịch đăng ✅.");
    return;
  }

  console.log(
    `[Scheduler] Tìm thấy ${postsToPublish.length} bài viết đến lịch đăng.`
  );

  for (const post of postsToPublish) {
    publishPost(post.id).catch((error) => {
      console.error(
        `[Scheduler] Lỗi khi tự động đăng bài ID ${post.id}:`,
        error.message
      );
    });
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
  reschedulePost,
  processScheduledPostsToPublish,
};
