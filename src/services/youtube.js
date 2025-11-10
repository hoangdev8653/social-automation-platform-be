const { google } = require("googleapis");
const db = require("../models");
const ApiError = require("../utils/ApiError");
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const scopes = [
  "https://www.googleapis.com/auth/youtube.upload", // Thêm scope để đăng video
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * Khởi tạo một YouTube client đã được xác thực.
 * Tự động làm mới access token nếu nó đã hết hạn.
 * @param {string} socialAccountId - ID của SocialAccount trong DB.
 * @returns {Promise<object>} - Một instance của YouTube API client.
 */
const getAuthenticatedYouTubeClient = async (socialAccountId) => {
  const socialAccount = await db.SocialAccount.findByPk(socialAccountId);

  if (!socialAccount || !socialAccount.refresh_token) {
    throw new ApiError(
      400,
      `Tài khoản YouTube (ID: ${socialAccountId}) không tìm thấy hoặc thiếu refresh token.`
    );
  }

  // Tạo một instance oauth2Client mới cho mỗi lần gọi để tránh xung đột
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  client.setCredentials({
    access_token: socialAccount.access_token,
    refresh_token: socialAccount.refresh_token,
  });

  // Luôn làm mới token trước khi sử dụng để đảm bảo tính hợp lệ.
  // google-auth-library sẽ chỉ thực hiện yêu cầu mạng nếu token thực sự sắp hết hạn.
  try {
    const { credentials } = await client.refreshAccessToken();
    // Cập nhật credentials mới vào client và DB
    client.setCredentials(credentials);
    console.log(
      `Access token cho tài khoản ${socialAccount.account_name} đã được làm mới.`
    );
    // Chỉ cập nhật access_token mới, giữ nguyên refresh_token nếu nó không thay đổi.
    if (credentials.access_token) {
      await socialAccount.update({ access_token: credentials.access_token });
    }
  } catch (refreshError) {
    console.error("Lỗi khi làm mới access token:", refreshError.message);
    throw new ApiError(
      401,
      "Không thể làm mới access token. Vui lòng xác thực lại tài khoản YouTube."
    );
  }

  return google.youtube({ version: "v3", auth: client });
};

const getYouTubeAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  });
};

const getTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken({
    code,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  });
  return tokens;
};

const getUserChannel = async (tokens) => {
  oauth2Client.setCredentials(tokens);

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  const response = await youtube.channels.list({
    part: "snippet,contentDetails,statistics",
    mine: true,
  });

  if (!response.data.items || response.data.items.length === 0) {
    throw new Error("Không tìm thấy kênh YouTube nào cho người dùng này.");
  }

  const channel = response.data.items[0];

  return {
    platform: "youtube",
    platformId: channel.id,
    name: channel.snippet.title,
    avatar: channel.snippet.thumbnails.high.url,
    fanCount: parseInt(channel.statistics.subscriberCount, 10) || 0,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  };
};

const createOrUpdateChannel = async (channelData) => {
  try {
    const channelExits = await db.SocialAccount.findOne({
      where: {
        account_id: channelData.platformId,
      },
    });
    console.log(channelExits);

    if (!channelExits) {
      const newChannel = await db.SocialAccount.create({
        platform_id: process.env.ID_PLATFORM_YOUTUBE,
        account_id: channelData.platformId,
        account_name: channelData.name,
        account_image: channelData.avatar,
        fan_counts: channelData.fanCount,
        access_token: channelData.accessToken,
        refresh_token: channelData.refreshToken,
      });
      return newChannel;
    } else {
      const updated = await channelExits.update(
        {
          account_name: channelData.name,
          account_image: channelData.avatar,
          fan_counts: channelData.fanCount,
          access_token: channelData.accessToken,
          refresh_token: channelData.refreshToken,
        },
        { returning: true }
      );
      return updated;
    }
  } catch (error) {
    console.error("❌ Lỗi khi tạo hoặc cập nhật kênh YouTube:", error);
    throw error;
  }
};

module.exports = {
  getYouTubeAuthUrl,
  getAuthenticatedYouTubeClient,
  getTokens,
  getUserChannel,
  createOrUpdateChannel,
};
