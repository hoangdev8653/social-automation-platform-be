const { PostTargets, SocialAccount, Platform } = require("../models");
const axios = require("axios");
const db = require("../models");
const fs = require("fs");
const path = require("path");
const { getAuthenticatedYouTubeClient } = require("./youtube");
const { postTweet, uploadMediaToX, refreshXToken } = require("./x");

const GRAPH_API_VERSION = "v19.0";

const publishToFacebook = async (target, post) => {
  const pageId = target.SocialAccount.account_id;
  const pageAccessToken = target.SocialAccount.access_token;
  const message = `${post.caption || ""}\n\n${post.hashtags || ""}`.trim();

  const hasMedia = post.media && post.media.length > 0;
  const hasVideo = hasMedia && post.media.some((m) => m.type === "video");
  const images = hasMedia ? post.media.filter((m) => m.type === "image") : [];
  const hasImages = images.length > 0;

  try {
    if (hasVideo) {
      const videoUrl = post.media.find((m) => m.type === "video").url;
      const endpoint = `https://graph-video.facebook.com/${GRAPH_API_VERSION}/${pageId}/videos`;
      const response = await axios.post(endpoint, {
        access_token: pageAccessToken,
        file_url: videoUrl,
        description: message,
      });

      const videoId = response.data.id;
      console.log("Video upload initiated, ID:", videoId);
      return `https://facebook.com/${videoId}`;
    }

    if (hasImages) {
      const imageUrls = images.map((m) => m.url);

      if (images.length === 1) {
        const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`;
        const response = await axios.post(endpoint, {
          access_token: pageAccessToken,
          url: imageUrls[0],
          caption: message,
        });
        const postId = response.data.post_id;
        return `https://facebook.com/${postId}`;
      } else {
        const attachedMedia = [];
        for (const url of imageUrls) {
          const uploadEndpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`;
          const uploadResponse = await axios.post(uploadEndpoint, {
            access_token: pageAccessToken,
            url: url,
            published: false,
          });
          attachedMedia.push({ media_fbid: uploadResponse.data.id });
        }

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

    const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/feed`;
    const response = await axios.post(endpoint, {
      access_token: pageAccessToken,
      message: message,
    });
    const postId = response.data.id;
    return `https://facebook.com/${postId}`;
  } catch (error) {
    console.error(
      "Facebook API Error:",
      error.response ? error.response.data : error.message
    );
    throw new Error(
      error.response?.data?.error?.message || "Lỗi không xác định từ Facebook."
    );
  }
};

const publishToYouTube = async (target, post) => {
  const videoMedia = post.media?.find((m) => m.type === "video");
  if (!videoMedia) {
    throw new Error("Không có video nào trong bài viết để đăng lên YouTube.");
  }

  const socialAccountId = target.SocialAccount.id;
  const videoUrl = videoMedia.url;

  const youtube = await getAuthenticatedYouTubeClient(socialAccountId);

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

    const videoMetadata = {
      snippet: {
        title:
          post.caption?.substring(0, 100) ||
          `Video from ${new Date().toISOString()}`,
        description: `${post.caption || ""}\n\n${post.hashtags || ""}`.trim(),
      },
      status: {
        privacyStatus: "public",
      },
    };

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
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};

const publishToX = async (target, post) => {
  let socialAccount = target.SocialAccount;
  let accessToken = socialAccount.access_token;
  const textToPost = `${post.caption || ""}\n\n${post.hashtags || ""}`.trim();
  const uniqueId = Date.now();
  const uniqueTextToPost = `${textToPost} ${uniqueId}`;

  const tryPost = async (token) => {
    const mediaIds = [];

    if (post.media && post.media.length > 0) {
      console.log(` -> Bắt đầu upload ${post.media.length} media lên X...`);
      for (const media of post.media) {
        const mediaId = await uploadMediaToX(token, media);
        mediaIds.push(mediaId);
        console.log(` -> Upload thành công media, ID: ${mediaId}`);
      }
    }

    const { id: tweetId } = await postTweet(token, uniqueTextToPost, mediaIds);
    const username = socialAccount.account_name;
    return `https://twitter.com/${username}/status/${tweetId}`;
  };

  try {
    return await tryPost(accessToken);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log(
        ` -> Access token cho X (${socialAccount.account_name}) đã hết hạn. Đang làm mới...`
      );
      try {
        const currentAccount = await SocialAccount.findByPk(socialAccount.id);
        console.log(currentAccount);

        if (!currentAccount.refresh_token) {
          throw new Error("Không tìm thấy refresh token để làm mới.");
        }

        const newTokens = await refreshXToken(currentAccount.refresh_token);

        await currentAccount.update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
        });

        console.log(" -> Làm mới token thành công. Thử đăng lại...");
        socialAccount = currentAccount;
        accessToken = newTokens.access_token;

        return await tryPost(accessToken);
      } catch (refreshError) {
        console.error(" -> Lỗi không thể làm mới token cho X:", refreshError);
        throw new Error(
          "Token đã hết hạn và không thể làm mới. Vui lòng kết nối lại tài khoản X."
        );
      }
    }
    throw error;
  }
};

const publishToSocialMedia = async (postToPublish, transaction) => {
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
      } else if (platformName === "youtube") {
        console.log(
          ` -> Đang đăng lên YouTube Channel (Target ID: ${target.id})`
        );
        publishedUrl = await publishToYouTube(target, postToPublish);
      } else if (platformName === "x" || platformName === "twitter") {
        console.log(
          ` -> Đang đăng lên X/Twitter Account (Target ID: ${target.id})`
        );
        publishedUrl = await publishToX(target, postToPublish);
      }

      await PostTargets.update(
        { status: "published", published_url: publishedUrl },
        { where: { id: target.id }, transaction }
      );
      console.log(
        ` -> Đăng thành công Target ID: ${target.id}. URL: ${publishedUrl}`
      );
    } catch (error) {
      console.error(`Lỗi khi đăng bài lên target ${target.id}:`, error);
      await PostTargets.update(
        { status: "failed", error_message: error.message },
        { where: { id: target.id }, transaction }
      );
      console.log(` -> Đăng thất bại Target ID: ${target.id}`);
    }
  }

  const finalTargets = await postToPublish.getPostTargets({ transaction });
  const isAllPublished = finalTargets.every((t) => t.status === "published");
  const finalStatus = isAllPublished ? "published" : "failed";
  await postToPublish.update({ status: finalStatus }, { transaction });
  console.log(`Hoàn tất quá trình đăng bài (Post ID: ${postToPublish.id}).`);
};

module.exports = {
  publishToSocialMedia,
};
