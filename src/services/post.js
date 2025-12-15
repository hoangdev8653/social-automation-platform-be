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
  Sequelize, // Import Sequelize để dùng Op
  ActivityLog, // Thêm ActivityLog để ghi log
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
    const initialStatus = scheduledTime ? "pending_approval" : "draft";
    const newPost = await Post.create(
      {
        user_id: userId,
        caption,
        hashtags,
        scheduled_time: scheduledTime,
        status: initialStatus, // Nếu có lịch thì chuyển sang chờ duyệt
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
      status: "pending", // Luôn khởi tạo là pending, chờ duyệt hoặc chờ đăng
    }));
    await PostTargets.bulkCreate(postTargetsToCreate, { transaction: t });

    // Nếu tất cả thành công, commit transaction
    await t.commit();

    // Ghi log hoạt động
    // Tách ra khỏi transaction chính để nếu ghi log lỗi cũng không ảnh hưởng đến việc tạo bài viết
    try {
      const captionSnippet = newPost.caption
        ? `${newPost.caption.substring(0, 30)}...`
        : "(Không có caption)";
      await ActivityLog.create({
        user_id: userId, // Sửa lại tên trường cho đúng với model
        action: "Tạo bài viết",
        target_id: newPost.id,
        target_type: "post",
        details: `Nhân viên tạo bài viết "${captionSnippet}" và chuyển sang trạng thái chờ duyệt.`,
      });
    } catch (logError) {
      console.error("Ghi log hoạt động thất bại:", logError);
    }

    return newPost; // Trả về bài post vừa tạo
  } catch (error) {
    // Nếu có bất kỳ lỗi nào, rollback tất cả các thay đổi
    await t.rollback();

    // Ghi log cho hành động tạo bài viết thất bại
    try {
      await ActivityLog.create({
        user_id: userId, // Sửa lại tên trường cho đúng với model
        action: "Tạo bài viết thất bại",
        target_type: "post", // target_id không có vì post chưa được tạo thành công
        details: `Tạo bài viết thất bại. Lỗi: ${error.message}`,
      });
    } catch (logError) {
      // Nếu việc ghi log cũng thất bại, chỉ ghi ra console để không ảnh hưởng luồng chính
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
  // Bắt đầu một transaction lớn cho cả quá trình duyệt và đăng
  const t = await sequelize.transaction();
  try {
    const post = await Post.findByPk(postId, { transaction: t });

    if (!post) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bài viết.");
    }

    if (["approved", "publishing", "scheduled"].includes(post.status)) {
      post.dataValues.message = `Bài viết đã được duyệt và đang trong hàng đợi xử lý (trạng thái: ${post.status}).`;
      await t.commit(); // Vẫn commit vì không có lỗi, chỉ là không làm gì thêm
      return post;
    }

    // Chỉ cho phép duyệt các bài viết ở trạng thái nháp, chờ duyệt hoặc đã thất bại
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
      // Kịch bản 1: Duyệt đúng hạn -> Lên lịch đăng
      newStatus = "scheduled";
      notificationMessage = `Bài viết "${postSnippet}" của bạn đã được duyệt và sẽ được đăng vào lúc ${post.scheduled_time}.`;
    } else if (post.scheduled_time) {
      // Kịch bản 2: Duyệt sau khi đã lỡ lịch -> Yêu cầu nhân viên đặt lại lịch
      newStatus = "missed_schedule";
      notificationMessage = `Bài viết "${postSnippet}" đã được duyệt nhưng bị lỡ lịch. Vui lòng đặt lại thời gian đăng.`;
      notificationType = "post_missed_schedule";
    } else {
      // Kịch bản 3: Đăng ngay, không hẹn giờ
      newStatus = "approved"; // Tín hiệu để đăng ngay
      notificationMessage = `Bài viết "${postSnippet}" của bạn đã được duyệt và đang được đăng.`;
    }

    post.status = newStatus;
    post.approved_by = adminId;
    post.approved_at = new Date();
    await post.save({ transaction: t });

    // Nếu là bài viết lên lịch (scheduled), cập nhật trạng thái target thành scheduled.
    // Nếu là đăng ngay (approved), giữ nguyên hoặc cập nhật để chuẩn bị publish.
    if (["scheduled", "missed_schedule"].includes(newStatus)) {
      await PostTargets.update(
        { status: newStatus },
        { where: { post_id: post.id }, transaction: t }
      );
    }

    // Thông báo duyệt bài như bình thường
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

    // Dựa trên trạng thái mới, ghi log và thực hiện hành động tương ứng
    if (newStatus === "scheduled") {
      // Ghi log cho bài viết được lên lịch thành công
      await ActivityLog.create(
        {
          user_id: adminId, // Sửa lại tên trường cho đúng với model
          action: "Lên lịch bài viết",
          target_id: post.id,
          target_type: "post",
          details: `Bài viết "${postSnippet}" đã được duyệt và lên lịch đăng vào lúc ${post.scheduled_time}.`,
        },
        { transaction: t }
      );
    } else if (newStatus === "approved") {
      // Chỉ đăng ngay khi không có lịch hẹn
      // Nếu bài viết được đăng ngay, gọi hàm publish và ghi log kết quả
      // Trạng thái 'approved' ở đây chỉ là tín hiệu để đăng ngay, trạng thái thực tế sẽ là 'publishing'
      try {
        await publishPost(postId, t);
        await ActivityLog.create(
          {
            user_id: adminId, // Sửa lại tên trường cho đúng với model
            action: "Bắt đầu đăng bài",
            target_id: post.id,
            target_type: "post",
            details: `Bài viết "${postSnippet}" đã được duyệt và bắt đầu quá trình đăng.`,
          },
          { transaction: t }
        );
      } catch (publishError) {
        // Gán lỗi vào đối tượng error để khối catch bên ngoài có thể truy cập và ghi log chi tiết
        publishError.post = post; // Gán post vào lỗi để có thể lấy snippet

        // Nếu quá trình đăng gặp lỗi, ném lỗi để rollback transaction và ghi log thất bại ở khối catch bên ngoài
        throw publishError;
      }
    }

    await t.commit();
    return post;
  } catch (error) {
    await t.rollback();

    // Ghi log lỗi chung, bao gồm cả lỗi khi đăng bài
    try {
      const postSnippet = error.post?.caption
        ? `${error.post.caption.substring(0, 50)}...`
        : `(ID: ${postId})`;
      await ActivityLog.create({
        user_id: adminId, // Sửa lại tên trường cho đúng với model
        action: "Đăng bài thất bại", // Action cụ thể hơn cho lỗi khi đăng ngay
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

    // Cho phép từ chối bài viết đang chờ duyệt hoặc đã lỡ lịch duyệt
    if (!["pending_approval", "draft"].includes(post.status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể từ chối bài viết đang ở trạng thái '${post.status}'.`
      );
    }

    // Cập nhật trạng thái và lý do từ chối
    post.status = "rejected";
    post.rejected_reason = reason || "Không có lý do cụ thể.";
    await post.save({ transaction: t });

    // Cập nhật trạng thái các target thành rejected
    await PostTargets.update(
      { status: "rejected" },
      { where: { post_id: post.id }, transaction: t }
    );

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

    // Ghi log hành động từ chối bài viết
    try {
      await ActivityLog.create(
        {
          user_id: adminId, // Sửa lại tên trường cho đúng với model
          action: "Từ chối bài viết",
          target_id: post.id,
          target_type: "post",
          details: `Admin đã từ chối bài viết "${postSnippet}". Lý do: ${post.rejected_reason}`,
        },
        { transaction: t }
      ); // Thêm vào transaction
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

    // Ghi log hành động xóa bài viết
    try {
      const captionSnippet = post.caption
        ? `${post.caption.substring(0, 50)}...`
        : "(Không có caption)";
      await ActivityLog.create({
        user_id: deletedByUserId, // Sửa lại tên trường cho đúng với model
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
          where: {
            status: { [Sequelize.Op.in]: ["pending", "scheduled", "approved"] },
          }, // Lấy các target đang chờ xử lý (bao gồm cả đã lên lịch/duyệt)
          include: [
            // Sửa lỗi: Thêm include SocialAccount để lấy access_token và page_id
            {
              model: SocialAccount,
              attributes: [
                "id",
                "account_name",
                "account_id",
                "access_token",
                "refresh_token",
              ],
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

    // Cập nhật trạng thái các target thành 'published' sau khi đăng thành công
    await PostTargets.update(
      { status: "published", published_at: new Date() },
      {
        where: { post_id: postId, status: { [Sequelize.Op.ne]: "failed" } },
        transaction: t,
      }
    );

    // Cập nhật trạng thái bài viết thành 'published'
    postToPublish.status = "published";
    await postToPublish.save({ transaction: t });

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
      // Cập nhật trạng thái các target thành 'failed' để hiển thị lỗi ở front-end
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

    // Chỉ cho phép đặt lại lịch cho bài viết của chính mình
    if (post.user_id !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền sửa bài viết này."
      );
    }

    // Chỉ cho phép đặt lại lịch khi bài viết ở trạng thái 'missed_schedule'
    if (!["missed_schedule"].includes(post.status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể đặt lại lịch cho bài viết có trạng thái '${post.status}'.`
      );
    }

    // Kiểm tra thời gian lên lịch mới phải là tương lai
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

    // Logic chuyển trạng thái:
    // - Nếu bị lỡ lịch (missed_schedule) -> Chuyển thành scheduled (đã duyệt rồi, chỉ cần chờ đăng).

    const newStatus =
      post.status === "missed_schedule" ? "scheduled" : "pending_approval";

    post.scheduled_time = newScheduledTime;
    post.status = newStatus;
    await post.save({ transaction: t });

    // Đồng bộ trạng thái PostTargets
    await PostTargets.update(
      { status: newStatus },
      { where: { post_id: postId }, transaction: t }
    );

    // Ghi log hành động
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
    attributes: ["id"], // Chỉ cần lấy ID để xử lý, cho hiệu quả
  });

  if (postsToPublish.length === 0) {
    // Dòng log này hữu ích để biết scheduler vẫn đang chạy đúng.
    // Bạn có thể bỏ comment nếu muốn thấy nó mỗi phút.
    console.log("[Scheduler] Không có bài viết nào đến lịch đăng ✅.");
    return;
  }

  console.log(
    `[Scheduler] Tìm thấy ${postsToPublish.length} bài viết đến lịch đăng.`
  );

  // Lặp qua và bắt đầu quá trình đăng cho từng bài.
  // Chúng ta không `await` ở đây để các bài viết có thể được xử lý song song,
  // và một lỗi không chặn các bài khác.
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
