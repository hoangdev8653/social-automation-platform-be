const axios = require("axios");
const {
  SocialAccount,
  Platform,
  Sequelize,
  PostTargets,
  Post,
} = require("../models");

const GRAPH_API_VERSION = "v19.0";

const fetchFacebookEngagement = async (pageId, accessToken) => {
  try {
    const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/posts`;
    const response = await axios.get(endpoint, {
      params: {
        fields:
          "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares",
        limit: 10,
        access_token: accessToken,
      },
    });
    const posts = response.data.data || [];
    let totalEngagement = 0;

    for (const post of posts) {
      const likes = post.reactions?.summary?.total_count || 0;
      const comments = post.comments?.summary?.total_count || 0;
      const shareCount = post.shares?.count || 0;
      totalEngagement += likes + comments + shareCount;
    }

    console.log(
      `[DEBUG] Tổng tương tác tính được cho Page ID ${pageId}: ${totalEngagement}`
    );

    return totalEngagement;
  } catch (error) {
    console.error(
      `Lỗi khi lấy dữ liệu tương tác cho page ${pageId}:`,
      error.response?.data?.error || error.message
    );
    return -1;
  }
};

const fetchYouTubeEngagement = async (channelId, apiKey) => {
  try {
    const YOUTUBE_API_ENDPOINT = "https://www.googleapis.com/youtube/v3";

    const searchResponse = await axios.get(`${YOUTUBE_API_ENDPOINT}/search`, {
      params: {
        part: "snippet",
        channelId: channelId,
        maxResults: 50,
        order: "date",
        type: "video",
        key: apiKey,
      },
    });

    const videoIds = searchResponse.data.items
      .map((item) => item.id.videoId)
      .join(",");

    if (!videoIds) {
      return 0;
    }

    const videosResponse = await axios.get(`${YOUTUBE_API_ENDPOINT}/videos`, {
      params: {
        part: "statistics",
        id: videoIds,
        key: apiKey,
      },
    });

    let totalEngagement = 0;
    for (const video of videosResponse.data.items) {
      const stats = video.statistics;
      const likes = parseInt(stats.likeCount) || 0;
      const comments = parseInt(stats.commentCount) || 0;
      totalEngagement += likes + comments;
    }

    console.log(
      `[DEBUG] Tổng tương tác tính được cho YouTube Channel ID ${channelId}: ${totalEngagement}`
    );
    return totalEngagement;
  } catch (error) {
    console.error(
      `Lỗi khi lấy dữ liệu tương tác cho YouTube channel ${channelId}:`,
      error.response?.data?.error || error.message
    );
    return -1;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fetchTwitterEngagement = async (userId, bearerToken) => {
  try {
    const endpoint = `https://api.twitter.com/2/users/${userId}/tweets`;
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      params: {
        "tweet.fields": "public_metrics",
        max_results: 10,
      },
    });

    const tweets = response.data.data || [];
    let totalEngagement = 0;

    for (const tweet of tweets) {
      const metrics = tweet.public_metrics;
      if (metrics) {
        totalEngagement += metrics.reply_count || 0;
        totalEngagement += metrics.like_count || 0;
      }
    }

    console.log(
      `[DEBUG] Tổng tương tác tính được cho Twitter User ID ${userId}: ${totalEngagement}`
    );
    return totalEngagement;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      if (retryCount < 3) {
        console.warn(
          `[WARNING] Twitter 429 cho user ${userId}. Đang chờ 15 phút để thử lại... (Lần ${
            retryCount + 1
          })`
        );

        await sleep(900000);

        return fetchTwitterEngagement(userId, bearerToken, retryCount + 1);
      } else {
        console.error(
          `[ERROR] Đã thử lại 3 lần nhưng vẫn bị 429 cho user ${userId}. Bỏ qua.`
        );
        return -1;
      }
    }

    console.error(
      `Lỗi khi lấy dữ liệu tương tác cho Twitter user ${userId}:`,
      error.response?.data?.error || error.message
    );
    return -1;
  }
};

const refreshAllFollowerCounts = async () => {
  console.log("Bắt đầu làm mới số liệu tương tác...");
  const accounts = await SocialAccount.findAll({ include: "platform" });

  for (const account of accounts) {
    let totalEngagement = -1;
    const platformName = account.platform.name.toLowerCase();

    if (platformName === "facebook") {
      totalEngagement = await fetchFacebookEngagement(
        account.account_id,
        account.access_token
      );
    } else if (platformName === "youtube") {
      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      totalEngagement = await fetchYouTubeEngagement(
        account.account_id,
        YOUTUBE_API_KEY
      );
    } else if (platformName === "twitter") {
      const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
      totalEngagement = await fetchTwitterEngagement(
        account.account_id,
        TWITTER_BEARER_TOKEN
      );
    }

    if (totalEngagement !== -1) {
      console.log(
        `[DEBUG] Chuẩn bị cập nhật tài khoản ${account.account_name} với total_engagement = ${totalEngagement}`
      );

      await account.update({ total_engagement: totalEngagement });
      console.log(
        `Cập nhật thành công cho tài khoản ${account.account_name}: ${totalEngagement} tương tác.`
      );
    }
  }
  console.log("Hoàn tất làm mới số liệu tương tác.");
};

const getAnalyticOverview = async () => {
  const accountsData = await SocialAccount.findAll({
    include: {
      model: Platform,
      as: "platform",
      attributes: ["name", "image"],
    },
    attributes: [
      "total_engagement",
      [
        Sequelize.literal(
          `(SELECT COUNT(*) FROM "PostTargets" WHERE "PostTargets"."social_account_id" = "SocialAccount"."id")`
        ),
        "total_posts",
      ],
    ],
  });

  const platformAnalytics = {};
  let grandTotalEngagement = 0;

  accountsData.forEach((account) => {
    const platformName = account.platform.name;
    const platformImage = account.platform.image;
    const engagement = account.dataValues.total_engagement || 0;
    const posts = parseInt(account.dataValues.total_posts, 10) || 0;

    if (!platformAnalytics[platformName]) {
      platformAnalytics[platformName] = {
        platform: platformName,
        platform_image: platformImage,
        total_posts: 0,
        total_engagement: 0,
      };
    }

    platformAnalytics[platformName].total_posts += posts;
    platformAnalytics[platformName].total_engagement += engagement;
    grandTotalEngagement += engagement;
  });

  return Object.values(platformAnalytics).map((platform) => ({
    ...platform,
    engagement_percentage:
      grandTotalEngagement > 0
        ? ((platform.total_engagement / grandTotalEngagement) * 100).toFixed(2)
        : "0.00",
  }));
};

const getPostLevelEngagement = async (socialAccountId) => {
  const account = await SocialAccount.findByPk(socialAccountId, {
    include: "platform",
  });

  if (!account) {
    throw new Error("Không tìm thấy tài khoản mạng xã hội.");
  }

  const platformName = account.platform.name.toLowerCase();

  if (platformName === "facebook") {
    const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${account.account_id}/posts`;
    const response = await axios.get(endpoint, {
      params: {
        fields:
          "id,message,created_time,permalink_url,reactions.summary(total_count),comments.summary(total_count)",
        limit: 25,
        access_token: account.access_token,
      },
    });
    return (response.data.data || []).map((post) => ({
      id: post.id,
      content:
        post.message?.substring(0, 100) + "..." || "Bài viết không có nội dung",
      url: post.permalink_url,
      createdAt: post.created_time,
      engagement:
        (post.reactions?.summary?.total_count || 0) +
        (post.comments?.summary?.total_count || 0),
    }));
  } else if (platformName === "youtube") {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    const YOUTUBE_API_ENDPOINT = "https://www.googleapis.com/youtube/v3";

    const searchResponse = await axios.get(`${YOUTUBE_API_ENDPOINT}/search`, {
      params: {
        part: "snippet",
        channelId: account.account_id,
        maxResults: 25,
        order: "date",
        type: "video",
        key: YOUTUBE_API_KEY,
      },
    });

    const videoIds = searchResponse.data.items
      .map((item) => item.id.videoId)
      .join(",");
    if (!videoIds) return [];

    const videosResponse = await axios.get(`${YOUTUBE_API_ENDPOINT}/videos`, {
      params: {
        part: "statistics,snippet",
        id: videoIds,
        key: YOUTUBE_API_KEY,
      },
    });

    return (videosResponse.data.items || []).map((video) => ({
      id: video.id,
      content: video.snippet.title,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      createdAt: video.snippet.publishedAt,
      engagement:
        (parseInt(video.statistics.likeCount) || 0) +
        (parseInt(video.statistics.commentCount) || 0),
    }));
  } else if (platformName === "twitter") {
    const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
    const endpoint = `https://api.twitter.com/2/users/${account.account_id}/tweets`;
    const response = await axios.get(endpoint, {
      headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
      params: {
        "tweet.fields": "public_metrics,created_at",
        max_results: 25,
      },
    });

    return (response.data.data || []).map((tweet) => ({
      id: tweet.id,
      content: tweet.text,
      url: `https://twitter.com/anyuser/status/${tweet.id}`,
      createdAt: tweet.created_at,
      engagement:
        (tweet.public_metrics?.like_count || 0) +
        (tweet.public_metrics?.reply_count || 0),
    }));
  }

  return [];
};

const getEngagementForPublishedPost = async (postTargetId) => {
  const postTarget = await PostTargets.findByPk(postTargetId, {
    include: [
      {
        model: SocialAccount,
        as: "SocialAccount",
        include: { model: Platform, as: "platform" },
      },
    ],
  });

  if (!postTarget) {
    throw new Error("Không tìm thấy mục tiêu đăng bài.");
  }

  if (postTarget.status !== "published" || !postTarget.published_url) {
    return {
      engagement: 0,
      message: "Bài viết chưa được đăng hoặc không có URL.",
    };
  }

  const platformName = postTarget.SocialAccount.platform.name.toLowerCase();
  const url = postTarget.published_url;

  try {
    if (platformName === "facebook") {
      const postId = url.split("/").pop().split("?")[0];
      const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${postId}`;
      const response = await axios.get(endpoint, {
        params: {
          fields:
            "reactions.summary(total_count),comments.summary(total_count)",
          access_token: postTarget.SocialAccount.access_token,
        },
      });
      const data = response.data;
      return {
        likes: data.reactions?.summary?.total_count || 0,
        comments: data.comments?.summary?.total_count || 0,
      };
    } else if (platformName === "youtube") {
      const videoId = new URL(url).searchParams.get("v");
      if (!videoId) throw new Error("Không thể trích xuất Video ID từ URL.");

      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      const endpoint = `https://www.googleapis.com/youtube/v3/videos`;
      const response = await axios.get(endpoint, {
        params: { part: "statistics", id: videoId, key: YOUTUBE_API_KEY },
      });
      const stats = response.data.items[0]?.statistics;
      return {
        likes: parseInt(stats?.likeCount) || 0,
        comments: parseInt(stats?.commentCount) || 0,
        views: parseInt(stats?.viewCount) || 0,
      };
    } else if (platformName === "twitter") {
      const tweetId = url.split("/status/").pop().split("?")[0];
      const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
      const endpoint = `https://api.twitter.com/2/tweets/${tweetId}`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
        params: { "tweet.fields": "public_metrics" },
      });
      const metrics = response.data.data?.public_metrics;
      return {
        likes: metrics?.like_count || 0,
        replies: metrics?.reply_count || 0,
        views: metrics?.view_count || 0,
      };
    }
  } catch (error) {
    if (
      platformName === "facebook" &&
      error.response?.data?.error?.code === 100
    ) {
      const specificMessage =
        "Lỗi Facebook (#100): URL được lưu có thể là của một Trang (Page) thay vì một bài viết (Post).";
      console.error(
        `Lỗi khi lấy tương tác cho ${url}:`,
        specificMessage,
        error.response.data.error
      );
      return { engagement: -1, message: specificMessage };
    }

    if (platformName === "twitter" && error.response?.status === 429) {
      const specificMessage =
        "Lỗi Twitter (429): Quá nhiều yêu cầu (Too Many Requests). API đã tạm thời giới hạn truy cập.";
      console.error(
        `Lỗi khi lấy tương tác cho ${url}:`,
        specificMessage,
        error.response.data
      );
      return { engagement: -1, message: specificMessage };
    }

    const errorMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.detail ||
      "Lỗi không xác định khi lấy dữ liệu từ API.";
    console.error(
      `Lỗi khi lấy tương tác cho ${url}:`,
      error.response?.data || error.message
    );
    return { engagement: -1, message: "Lỗi khi lấy dữ liệu từ API." };
  }

  return { engagement: 0, message: "Nền tảng không được hỗ trợ." };
};

const getAllPostsEngagement = async () => {
  const publishedPosts = await PostTargets.findAll({
    where: {
      status: "published",
      published_url: { [Sequelize.Op.ne]: null },
    },
    include: [
      { model: Post, as: "Post", attributes: ["caption"] },
      {
        model: SocialAccount,
        as: "SocialAccount",
        include: { model: Platform, as: "platform" },
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  const engagementPromises = publishedPosts.map((postTarget) =>
    getEngagementForPublishedPost(postTarget.id)
  );

  const results = await Promise.allSettled(engagementPromises);

  const allPostsWithEngagement = [];

  results.forEach((result, index) => {
    const postTarget = publishedPosts[index];
    let engagementData = {
      likes: 0,
      comments: 0,
      replies: 0,
      views: 0,
      total: 0,
    };

    if (result.status === "fulfilled" && result.value) {
      const likes = result.value.likes || 0;
      const comments = result.value.comments || 0;
      const replies = result.value.replies || 0;
      const views = result.value.views || 0;
      engagementData = {
        likes,
        comments,
        replies,
        views,
        total: likes + comments + replies + views,
      };
      if (result.value.message) {
        engagementData.error = result.value.message;
      } else {
        const likes = result.value.likes || 0;
        const comments = result.value.comments || 0;
        const replies = result.value.replies || 0;
        const views = result.value.views || 0;
        engagementData = {
          likes,
          comments,
          replies,
          views,
          total: likes + comments + replies + views,
        };
      }
    }

    allPostsWithEngagement.push({
      id: postTarget.id,
      caption: postTarget.Post.caption,
      publishedUrl: postTarget.published_url,
      platform: postTarget.SocialAccount.platform.name,
      accountName: postTarget.SocialAccount.account_name,
      createdAt: postTarget.createdAt,
      engagement: engagementData,
    });
  });

  return allPostsWithEngagement.sort(
    (a, b) => b.engagement.total - a.engagement.total
  );
};

module.exports = {
  refreshAllFollowerCounts,
  getAnalyticOverview,
  getPostLevelEngagement,
  getEngagementForPublishedPost,
  getAllPostsEngagement,
};
