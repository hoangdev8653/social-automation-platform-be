const { PostTargets, SocialAccount, Platform } = require("../models"); // Sequelize models
const axios = require("axios"); // Thư viện để gọi API
const db = require("../models");
const fs = require("fs");
const path = require("path");
const { getAuthenticatedYouTubeClient } = require("./youtube");

const GRAPH_API_VERSION = "v19.0"; // Cập nhật phiên bản API hợp lệ

/**
 * Đăng bài lên Facebook Page.
 * @param {object} target - Một bản ghi từ PostTargets.
 * @param {object} post - Thông tin bài viết (caption, media).
 * @returns {Promise<string>} URL của bài viết đã đăng.
 */
const publishToFacebook = async (target, post) => {
  const pageId = target.SocialAccount.account_id;
  const pageAccessToken = target.SocialAccount.access_token;
  const message = `${post.caption || ""}\n\n${post.hashtags || ""}`.trim();

  const hasMedia = post.media && post.media.length > 0;
  // Kiểm tra xem có media nào là video không. Facebook không hỗ trợ đăng nhiều video trong 1 bài.
  const hasVideo = hasMedia && post.media.some((m) => m.type === "video");
  // Lấy tất cả media là hình ảnh.
  const images = hasMedia ? post.media.filter((m) => m.type === "image") : [];
  const hasImages = images.length > 0;

  try {
    // Trường hợp 1: Đăng video
    if (hasVideo) {
      const videoUrl = post.media[0].url; // Lấy URL public từ Cloudinary
      const endpoint = `https://graph-video.facebook.com/${GRAPH_API_VERSION}/${pageId}/videos`;
      const response = await axios.post(endpoint, {
        access_token: pageAccessToken,
        file_url: videoUrl, // Facebook sẽ tự tải video từ URL này
        description: message,
      });
      // API upload video là bất đồng bộ, nó không trả về post_id ngay.
      // Để đơn giản, ta sẽ đợi và lấy permalink sau.
      // Trong thực tế, bạn có thể cần kiểm tra trạng thái upload.
      // Tạm thời, ta sẽ không có URL trực tiếp cho video post.
      console.log("Video upload initiated:", response.data);
      return `https://facebook.com/${pageId}`; // Trả về URL của page
    }

    // Trường hợp 2: Đăng ảnh
    if (hasImages) {
      const imageUrls = images.map((m) => m.url);

      // Nếu chỉ có 1 ảnh, đăng trực tiếp
      if (images.length === 1) {
        const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`;
        const response = await axios.post(endpoint, {
          access_token: pageAccessToken,
          url: imageUrls[0], // URL public của ảnh từ Cloudinary
          caption: message,
        });
        const postId = response.data.post_id;
        return `https://facebook.com/${postId}`;
      }

      // Nếu có nhiều ảnh, cần upload từng ảnh và lấy ID, sau đó tạo post
      else {
        const attachedMedia = [];
        for (const url of imageUrls) {
          const uploadEndpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`;
          const uploadResponse = await axios.post(uploadEndpoint, {
            access_token: pageAccessToken,
            url: url,
            published: false, // Quan trọng: chỉ upload, không đăng ngay
          });
          attachedMedia.push({ media_fbid: uploadResponse.data.id });
        }

        // Tạo post với các ảnh đã upload
        const postEndpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/feed`;
        const postResponse = await axios.post(postEndpoint, {
          access_token: pageAccessToken,
          message: message,
          attached_media: attachedMedia,
        });
        const postId = postResponse.data.id;
        return `https://facebook.com/${postId}`;
      }
    }

    // Trường hợp 3: Chỉ đăng text (không có media)
    const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/feed`;
    const response = await axios.post(endpoint, {
      access_token: pageAccessToken,
      message: message,
    });
    const postId = response.data.id;
    return `https://facebook.com/${postId}`;
  } catch (error) {
    // Xử lý lỗi từ API của Facebook
    console.error(
      "Facebook API Error:",
      error.response ? error.response.data : error.message
    );
    // Ném lỗi để hàm `publishToSocialMedia` có thể bắt và xử lý
    throw new Error(
      error.response?.data?.error?.message || "Lỗi không xác định từ Facebook."
    );
  }
};

/**
 * Đăng video lên YouTube.
 * @param {object} target - Một bản ghi từ PostTargets.
 * @param {object} post - Thông tin bài viết (caption, media).
 * @returns {Promise<string>} URL của video đã đăng.
 */
const publishToYouTube = async (target, post) => {
  // 1. Kiểm tra xem có video để đăng không
  const videoMedia = post.media?.find((m) => m.type === "video");
  if (!videoMedia) {
    throw new Error("Không có video nào trong bài viết để đăng lên YouTube.");
  }

  const socialAccountId = target.SocialAccount.id;
  const videoUrl = videoMedia.url;

  // 2. Lấy client YouTube đã được xác thực (tự động refresh token)
  const youtube = await getAuthenticatedYouTubeClient(socialAccountId);

  // 3. Tải video từ Cloudinary về để tạo stream
  // YouTube API cần một file stream, không thể dùng URL trực tiếp như Facebook
  const tempDir = path.join(__dirname, "..", "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  const tempFilePath = path.join(tempDir, `video_${post.id}.mp4`);

  try {
    const response = await axios({
      method: "get",
      url: videoUrl,
      responseType: "stream",
    });

    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // 4. Chuẩn bị metadata cho video
    const videoMetadata = {
      snippet: {
        title:
          post.caption?.substring(0, 100) ||
          `Video from ${new Date().toISOString()}`,
        description: `${post.caption || ""}\n\n${post.hashtags || ""}`.trim(),
        // tags: post.hashtags ? post.hashtags.split(' ').map(t => t.replace('#', '')) : [],
      },
      status: {
        privacyStatus: "public", // hoặc 'private', 'unlisted'
      },
    };

    // 5. Gọi API để upload video
    const uploadResponse = await youtube.videos.insert({
      part: "snippet,status",
      resource: videoMetadata,
      media: {
        body: fs.createReadStream(tempFilePath),
      },
    });

    const videoId = uploadResponse.data.id;
    return `https://www.youtube.com/watch?v=${videoId}`;
  } finally {
    // 6. Xóa file tạm sau khi upload xong
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};

/**
 * Hàm điều phối, gọi hàm đăng bài tương ứng với nền tảng.
 * @param {object} postToPublish - Đối tượng post đầy đủ thông tin.
 * @param {object} transaction - Giao dịch Sequelize.
 */
const publishToSocialMedia = async (postToPublish, transaction) => {
  // Sửa lỗi logic: postToPublish.PostTargets đã chứa đủ thông tin cần thiết
  // từ hàm publishPost trong postService.
  if (!postToPublish.postTargets || postToPublish.postTargets.length === 0)
    return;
  console.log(
    `Bắt đầu đăng bài (Post ID: ${postToPublish.id}) lên ${postToPublish.postTargets.length} nền tảng.`
  );
  for (const target of postToPublish.postTargets) {
    try {
      let publishedUrl = "";
      const platformName = target.SocialAccount.platform.name.toLowerCase();

      if (platformName === "facebook") {
        console.log(
          ` -> Đang đăng lên Facebook Page (Target ID: ${target.id})`
        );
        publishedUrl = await publishToFacebook(target, postToPublish);
      } else if (platformName === "instagram") {
        // publishedUrl = await publishToInstagram(target, postToPublish);
      } else if (platformName === "youtube") {
        console.log(
          ` -> Đang đăng lên YouTube Channel (Target ID: ${target.id})`
        );
        publishedUrl = await publishToYouTube(target, postToPublish);
      }

      // Cập nhật trạng thái của target thành công
      await PostTargets.update(
        { status: "published", published_url: publishedUrl },
        { where: { id: target.id }, transaction }
      );
      console.log(
        ` -> Đăng thành công Target ID: ${target.id}. URL: ${publishedUrl}`
      );
    } catch (error) {
      console.error(`Lỗi khi đăng bài lên target ${target.id}:`, error);
      // Cập nhật trạng thái của target thất bại
      await PostTargets.update(
        { status: "failed", error_message: error.message },
        { where: { id: target.id }, transaction }
      );
      console.log(` -> Đăng thất bại Target ID: ${target.id}`);
    }
  }

  // Cải tiến: Sau khi lặp qua tất cả, kiểm tra trạng thái của các target để quyết định trạng thái cuối cùng cho Post
  // Reload lại các targets từ instance `postToPublish` để lấy trạng thái mới nhất trong transaction
  const finalTargets = await postToPublish.getPostTargets({ transaction }); // getPostTargets là hàm do Sequelize tạo ra
  // Kiểm tra xem tất cả các target có được publish thành công không
  const isAllPublished = finalTargets.every((t) => t.status === "published");
  // Nếu tất cả thành công -> 'published', ngược lại -> 'failed'
  const finalStatus = isAllPublished ? "published" : "failed";
  await postToPublish.update({ status: finalStatus }, { transaction });
  console.log(`Hoàn tất quá trình đăng bài (Post ID: ${postToPublish.id}).`);
};

module.exports = {
  publishToSocialMedia,
};
