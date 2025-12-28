const axios = require("axios");
const crypto = require("crypto");
const { Platform, SocialAccount } = require("../models");
const db = require("../models");
const FormData = require("form-data");

const X_CLIENT_ID = process.env.CLIENT_ID_X;
const X_CLIENT_SECRET = process.env.CLIENT_SECRET_X;
const X_REDIRECT_URI = "https://localhost:3007/api/v1/x/callback";

const SCOPES = ["tweet.read", "users.read", "tweet.write", "offline.access"];

function base64URLEncode(str) {
  return str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest();
}

const getXAuthUrl = () => {
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
      Authorization: `Basic ${Buffer.from(
        `${X_CLIENT_ID}:${X_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
  });

  return response.data;
};

const getUserInfo = async (accessToken) => {
  const userUrl =
    "https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics";

  const response = await axios.get(userUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data.data;
};

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

  return response.data.data;
};

const uploadMediaToX = async (accessToken, media) => {
  const { url: mediaUrl, metadata } = media;
  let mediaType = metadata?.mimetype;

  if (!mediaType && metadata?.format) {
    mediaType = `image/${metadata.format}`;
    if (["mp4", "mov", "webm"].includes(metadata.format)) {
      mediaType = `video/${metadata.format}`;
    }
    console.log(` -> Đã suy ra mimetype là '${mediaType}' từ metadata.format.`);
  }

  const mediaResponse = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
  });
  const mediaBuffer = Buffer.from(mediaResponse.data);

  const safeMediaType =
    mediaType && mediaType.includes("/")
      ? mediaType
      : "application/octet-stream";
  const fileExtension = safeMediaType.split("/")[1] || "bin";

  const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";

  const form = new FormData();
  form.append("media", mediaBuffer, {
    contentType: mediaType,
    filename: `upload.${fileExtension}`,
  });
  form.append(
    "media_category",
    safeMediaType.startsWith("video") ? "tweet_video" : "tweet_image"
  );

  const response = await axios.post(uploadUrl, form, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...form.getHeaders(),
    },
  });

  return response.data.media_id_string;
};

const refreshXToken = async (refreshToken) => {
  const tokenUrl = "https://api.twitter.com/2/oauth2/token";

  const params = new URLSearchParams();
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");
  params.append("client_id", X_CLIENT_ID);

  const response = await axios.post(tokenUrl, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${X_CLIENT_ID}:${X_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
  });

  return response.data;
};

module.exports = {
  getXAuthUrl,
  getTokens,
  getUserInfo,
  createOrUpdateXAccount,
  postTweet,
  uploadMediaToX,
  refreshXToken,
};
