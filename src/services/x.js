const axios = require("axios");
const crypto = require("crypto");
const { Platform, SocialAccount } = require("../models");
const db = require("../models");
const FormData = require("form-data");

const X_CLIENT_ID = process.env.CLIENT_ID_X;
const X_CLIENT_SECRET = process.env.CLIENT_SECRET_X;
const X_REDIRECT_URI = "https://localhost:3007/api/v1/x/callback";

const SCOPES = ["tweet.read", "users.read", "tweet.write", "offline.access"];

/**
 * Helper function to generate a base64url encoded string.
 */
function base64URLEncode(str) {
  return str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Helper function to create a SHA256 hash.
 */
function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest();
}

const getXAuthUrl = () => {
  // 1. Tạo code_verifier và code_challenge theo chuẩn PKCE
  const code_verifier = base64URLEncode(crypto.randomBytes(32));
  const code_challenge = base64URLEncode(sha256(code_verifier));
  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", X_CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", X_REDIRECT_URI);
  authUrl.searchParams.append("scope", SCOPES.join(" "));
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append("code_challenge", code_challenge);
  authUrl.searchParams.append("code_challenge_method", "S256");

  return {
    authUrl: authUrl.toString(),
    codeVerifier: code_verifier,
    state: state,
  };
};

/**
 * Dùng 'code' nhận được để đổi lấy access_token và refresh_token.
 * @param {string} code - Authorization code từ callback của X.
 * @param {string} codeVerifier - Code verifier đã tạo ở bước trước.
 */
const getTokens = async (code, codeVerifier) => {
  const tokenUrl = "https://api.twitter.com/2/oauth2/token";

  const params = new URLSearchParams();
  params.append("code", code);
  params.append("grant_type", "authorization_code");
  params.append("client_id", X_CLIENT_ID);
  params.append("redirect_uri", X_REDIRECT_URI);
  params.append("code_verifier", codeVerifier);

  const response = await axios.post(tokenUrl, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Xác thực bằng Basic Auth (Client ID:Client Secret)
      Authorization: `Basic ${Buffer.from(
        `${X_CLIENT_ID}:${X_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
  });

  return response.data; // Trả về { token_type, expires_in, access_token, scope, refresh_token }
};

/**
 * Dùng access_token để lấy thông tin người dùng.
 * @param {string} accessToken - Access token của người dùng.
 */
const getUserInfo = async (accessToken) => {
  // Yêu cầu các trường thông tin cần thiết: id, name, username, profile_image_url, public_metrics
  const userUrl =
    "https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics";

  const response = await axios.get(userUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data.data; // Trả về { id, name, username, profile_image_url, public_metrics }
};

/**
 * Lưu hoặc cập nhật thông tin tài khoản X vào database.
 * @param {object} userInfo - Thông tin người dùng từ getUserInfo.
 * @param {object} tokens - Thông tin token từ getTokens.
 */
const createOrUpdateXAccount = async (userInfo, tokens) => {
  const accountExit = await db.SocialAccount.findOne({
    where: {
      account_id: userInfo.id,
    },
  });
  if (!accountExit) {
    const newAccount = await db.SocialAccount.create({
      platform_id: process.env.ID_PLATFORM_TWITTER,
      account_id: userInfo.id,
      account_name: userInfo.username,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      account_image: userInfo.profile_image_url || null,
      fan_counts: userInfo.public_metrics?.followers_count || 0,
    });
    return newAccount;
  } else {
    const updatedAccount = await accountExit.update(
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        account_name: userInfo.username,
        account_image: userInfo.profile_image_url || null,
        fan_counts: userInfo.public_metrics?.followers_count || 0,
      },
      { new: true }
    );
    return updatedAccount;
  }
};

/**
 * Đăng một tweet lên X (Twitter).
 * Hỗ trợ đăng text và media.
 * @param {string} accessToken - Access token của người dùng.
 * @param {string} text - Nội dung của tweet.
 * @param {Array<string>} [mediaIds=[]] - Mảng các media ID đã được upload.
 * @returns {Promise<object>} Dữ liệu trả về từ API, chứa ID của tweet.
 */
const postTweet = async (accessToken, text, mediaIds = []) => {
  const tweetUrl = "https://api.twitter.com/2/tweets";
  const payload = { text };

  if (mediaIds.length > 0) {
    payload.media = {
      media_ids: mediaIds,
    };
  }

  const response = await axios.post(tweetUrl, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  return response.data.data; // Trả về { id, text }
};

/**
 * Tải một file media lên server của X (Twitter) để chuẩn bị đăng.
 * @param {string} accessToken - Access token của người dùng.
 * @param {string} mediaUrl - URL công khai của file media (từ Cloudinary).
 * @param {string} mediaType - Mimetype của file (ví dụ: 'image/jpeg', 'video/mp4').
 * @returns {Promise<string>} Media ID của file đã được upload.
 */
const uploadMediaToX = async (accessToken, media) => {
  const { url: mediaUrl, metadata } = media;
  let mediaType = metadata?.mimetype;

  // Dự phòng: Nếu không có mimetype, hãy thử suy ra từ format của Cloudinary
  if (!mediaType && metadata?.format) {
    mediaType = `image/${metadata.format}`; // Giả định là ảnh nếu không có thông tin khác
    if (["mp4", "mov", "webm"].includes(metadata.format)) {
      mediaType = `video/${metadata.format}`;
    }
    console.log(` -> Đã suy ra mimetype là '${mediaType}' từ metadata.format.`);
  }

  // 1. Tải file media từ URL về dưới dạng buffer
  const mediaResponse = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
  });
  const mediaBuffer = Buffer.from(mediaResponse.data);

  // An toàn hơn: Nếu mimetype vẫn không hợp lệ, sử dụng một giá trị mặc định
  const safeMediaType =
    mediaType && mediaType.includes("/")
      ? mediaType
      : "application/octet-stream";
  const fileExtension = safeMediaType.split("/")[1] || "bin";

  // 2. Gửi buffer lên endpoint upload của Twitter
  // Lưu ý: Endpoint này thuộc API v1.1 nhưng vẫn là cách chính thức để upload cho API v2
  const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";

  // Twitter yêu cầu dữ liệu upload phải là form-data
  const form = new FormData();
  form.append("media", mediaBuffer, {
    contentType: mediaType,
    // Tên file không quá quan trọng nhưng nên có phần mở rộng đúng
    filename: `upload.${fileExtension}`,
  });
  form.append(
    "media_category",
    safeMediaType.startsWith("video") ? "tweet_video" : "tweet_image"
  );

  const response = await axios.post(uploadUrl, form, {
    headers: {
      // API v1.1 yêu cầu xác thực OAuth 1.0a, nhưng với app-only hoặc user context v2,
      // chúng ta có thể dùng Bearer token. Tuy nhiên, để đảm bảo tương thích,
      // chúng ta cần một thư viện hỗ trợ OAuth 1.0a hoặc cấu hình phức tạp hơn.
      // Tạm thời, chúng ta sẽ thử với Bearer token, nếu không được sẽ cần thư viện như 'oauth-1.0a'.
      // **Cập nhật:** Thư viện `twitter-api-v2` thường được dùng để đơn giản hóa việc này.
      // Ở đây ta sẽ dùng `axios-oauth-1.0a` hoặc tự tạo header.
      // Để đơn giản, ta giả định Bearer token hoạt động cho app có quyền phù hợp.
      Authorization: `Bearer ${accessToken}`,
      ...form.getHeaders(),
    },
  });

  return response.data.media_id_string;
};

module.exports = {
  getXAuthUrl,
  getTokens,
  getUserInfo,
  createOrUpdateXAccount,
  postTweet,
  uploadMediaToX,
};
