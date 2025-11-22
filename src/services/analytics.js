const axios = require("axios");
const {
  SocialAccount,
  Platform,
  Sequelize,
  PostTargets,
  Post,
} = require("../models");

const GRAPH_API_VERSION = "v19.0";

/**
 * Lấy dữ liệu tương tác từ các bài viết của một Facebook Page.
 * @param {string} pageId - ID của Facebook Page.
 * @param {string} accessToken - Access token của page.
 * @returns {Promise<number>} Tổng số tương tác (like, comment, share).
 */
const fetchFacebookEngagement = async (pageId, accessToken) => {
  try {
    // Lấy các bài viết gần đây (tối đa 100 bài)
    const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/posts`;
    const response = await axios.get(endpoint, {
      params: {
        // Lấy các trường cần thiết để tính tương tác
        fields: "reactions.summary(total_count),comments.summary(total_count)",
        limit: 100, // Giới hạn số bài viết lấy về để tránh quá tải
        access_token: accessToken,
      },
    });

    // LOG 1: Xem dữ liệu thô mà Facebook trả về
    // console.log(
    //   `[DEBUG] Dữ liệu trả về từ Facebook cho Page ID ${pageId}:`,
    //   JSON.stringify(response.data, null, 2)
    // );

    const posts = response.data.data || [];
    let totalEngagement = 0;

    for (const post of posts) {
      const likes = post.reactions?.summary?.total_count || 0;
      const comments = post.comments?.summary?.total_count || 0;
      totalEngagement += likes + comments;
    }

    // LOG 2: Xem tổng tương tác đã được tính toán
    console.log(
      `[DEBUG] Tổng tương tác tính được cho Page ID ${pageId}: ${totalEngagement}`
    );

    return totalEngagement;
  } catch (error) {
    console.error(
      `Lỗi khi lấy dữ liệu tương tác cho page ${pageId}:`,
      error.response?.data?.error || error.message
    );
    return -1; // Trả về -1 để biết là có lỗi
  }
};

/**
 * Lấy dữ liệu tương tác từ các video của một kênh YouTube.
 * @param {string} channelId - ID của kênh YouTube.
 * @param {string} apiKey - API Key của bạn cho YouTube Data API.
 * @returns {Promise<number>} Tổng số tương tác (view, like, comment).
 */
const fetchYouTubeEngagement = async (channelId, apiKey) => {
  try {
    const YOUTUBE_API_ENDPOINT = "https://www.googleapis.com/youtube/v3";

    // 1. Lấy các video gần đây nhất của kênh
    const searchResponse = await axios.get(`${YOUTUBE_API_ENDPOINT}/search`, {
      params: {
        part: "snippet",
        channelId: channelId,
        maxResults: 50, // Lấy 50 video gần nhất
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

    // 2. Lấy thống kê chi tiết cho tất cả video đó trong 1 lần gọi
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
      totalEngagement += likes + comments; // Chỉ tính lượt thích và bình luận cho nhất quán
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

/**
 * Lấy dữ liệu tương tác từ các tweet của một tài khoản Twitter.
 * @param {string} userId - ID của người dùng Twitter.
 * @param {string} bearerToken - Bearer Token cho Twitter API v2.
 * @returns {Promise<number>} Tổng số tương tác (like, reply, retweet, quote).
 */
const fetchTwitterEngagement = async (userId, bearerToken) => {
  try {
    // Lấy các tweet gần đây (mặc định là 10, tối đa 100)
    const endpoint = `https://api.twitter.com/2/users/${userId}/tweets`;
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      params: {
        "tweet.fields": "public_metrics", // Yêu cầu lấy các chỉ số công khai
        max_results: 100, // Lấy 100 tweet gần nhất
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
    console.error(
      `Lỗi khi lấy dữ liệu tương tác cho Twitter user ${userId}:`,
      error.response?.data?.error || error.message
    );
    return -1;
  }
};

/**
 * Cập nhật số liệu thống kê (tương tác) cho tất cả các tài khoản.
 */
const refreshAllFollowerCounts = async () => {
  // Tên hàm vẫn giữ nguyên để không lỗi ở scheduler.js
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
      // Giả sử bạn lưu API key trong biến môi trường hoặc config
      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      totalEngagement = await fetchYouTubeEngagement(
        account.account_id, // account_id này phải là Channel ID
        YOUTUBE_API_KEY
      );
    } else if (platformName === "twitter") {
      // Giả sử bạn lưu Bearer Token trong biến môi trường hoặc config
      const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
      totalEngagement = await fetchTwitterEngagement(
        account.account_id, // account_id này phải là User ID của Twitter
        TWITTER_BEARER_TOKEN
      );
    }

    // Chỉ cập nhật nếu lấy dữ liệu thành công (khác -1)
    if (totalEngagement !== -1) {
      // Cập nhật vào cột total_engagement mới của bạn
      // LOG 3: Xem giá trị sắp được cập nhật vào DB
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
  // 1. Lấy tất cả dữ liệu tài khoản cần thiết
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

  // 2. Xử lý và tổng hợp dữ liệu
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

  // 3. Tính toán phần trăm và chuyển đổi thành mảng
  return Object.values(platformAnalytics).map((platform) => ({
    ...platform,
    engagement_percentage:
      grandTotalEngagement > 0
        ? ((platform.total_engagement / grandTotalEngagement) * 100).toFixed(2)
        : "0.00",
  }));
};

/**
 * Lấy danh sách chi tiết tương tác của từng bài viết cho một tài khoản cụ thể.
 * @param {string} socialAccountId - ID của tài khoản trong DB.
 * @returns {Promise<Array<object>>} - Một mảng các đối tượng bài viết với chi tiết tương tác.
 */
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
        limit: 25, // Lấy 25 bài gần nhất
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

    // Lấy 25 video gần nhất
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

  return []; // Trả về mảng rỗng nếu không phải nền tảng được hỗ trợ
};

/**
 * Lấy số liệu tương tác cho một bài viết đã được đăng, dựa vào PostTarget ID.
 * @param {string} postTargetId - ID của bản ghi trong bảng PostTargets.
 * @returns {Promise<object>} - Một đối tượng chứa số liệu tương tác.
 */
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
      // URL: https://facebook.com/884728328049911_122104393731107957
      // ID cần lấy là: 884728328049911_122104393731107957
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
      // URL: https://www.youtube.com/watch?v=Kkhhq9pIfWo
      // ID cần lấy là: Kkhhq9pIfWo
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
        views: parseInt(stats?.viewCount) || 0, // Thêm lượt xem cho YouTube
      };
    } else if (platformName === "twitter") {
      // URL: https://twitter.com/anyuser/status/1984920087594516480
      // ID cần lấy là: 1984920087594516480
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
        views: metrics?.view_count || 0, // Thêm lượt xem (impressions) cho Twitter
      };
    }
  } catch (error) {
    console.error(
      `Lỗi khi lấy tương tác cho ${url}:`,
      error.response?.data || error.message
    );
    return { engagement: -1, message: "Lỗi khi lấy dữ liệu từ API." };
  }

  return { engagement: 0, message: "Nền tảng không được hỗ trợ." };
};

/**
 * Lấy số liệu tương tác cho TẤT CẢ các bài viết đã được đăng.
 * @returns {Promise<Array<object>>} - Một mảng các bài viết cùng với số liệu tương tác của chúng.
 */
const getAllPostsEngagement = async () => {
  // 1. Lấy tất cả các bài viết đã được đăng và có URL
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

  // 2. Tạo một mảng các promise để lấy tương tác cho mỗi bài viết
  const engagementPromises = publishedPosts.map(
    (postTarget) => getEngagementForPublishedPost(postTarget.id) // Tái sử dụng hàm lấy tương tác cho 1 bài
  );

  // 3. Thực thi tất cả các promise đồng thời và xử lý kết quả
  // Dùng Promise.allSettled để nếu 1 promise lỗi, các promise khác vẫn tiếp tục
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
      const views = result.value.views || 0; // Lấy lượt xem
      engagementData = {
        likes,
        comments,
        replies,
        views, // Bao gồm lượt xem
        total: likes + comments + replies + views, // Cập nhật tổng tương tác bao gồm lượt xem
      };
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

  // 4. Sắp xếp kết quả cuối cùng theo tổng tương tác giảm dần
  return allPostsWithEngagement.sort(
    (a, b) => b.engagement.total - a.engagement.total
  );
};

module.exports = {
  refreshAllFollowerCounts,
  getAnalyticOverview, // Thêm hàm mới vào đây
  getPostLevelEngagement,
  getEngagementForPublishedPost,
  getAllPostsEngagement,
};
