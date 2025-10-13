const axios = require("axios");
const { SocialAccount, Platform } = require("../models");

const GRAPH_API_VERSION = "v19.0";

/**
 * Lấy dữ liệu fan_count từ Facebook Graph API.
 * @param {string} pageId - ID của Facebook Page.
 * @param {string} accessToken - Access token của page.
 * @returns {Promise<number>} Số lượng người theo dõi.
 */
const fetchFacebookFollowerCount = async (pageId, accessToken) => {
  try {
    const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}`;
    const response = await axios.get(endpoint, {
      params: {
        fields: "fan_count", // fan_count bao gồm cả likes và follows
        access_token: accessToken,
      },
    });
    console.log(response.data);

    return response.data.fan_count || 0;
  } catch (error) {
    console.error(
      `Lỗi khi lấy follower count cho page ${pageId}:`,
      error.response?.data?.error || error.message
    );
    return -1; // Trả về -1 để biết là có lỗi
  }
};

/**
 * Cập nhật số lượng người theo dõi cho tất cả các tài khoản.
 */
const refreshAllFollowerCounts = async () => {
  console.log("Bắt đầu làm mới số liệu người theo dõi...");
  const accounts = await SocialAccount.findAll({ include: "platform" });

  for (const account of accounts) {
    let followerCount = -1;
    const platformName = account.platform.name.toLowerCase();

    if (platformName === "facebook") {
      followerCount = await fetchFacebookFollowerCount(
        account.account_id,
        account.access_token
      );
    }
    // else if (platformName === 'instagram') { ... }

    // Chỉ cập nhật nếu lấy dữ liệu thành công (khác -1)
    if (followerCount !== -1) {
      await account.update({ follower_count: followerCount });
      console.log(
        `Cập nhật thành công cho tài khoản ${account.account_name}: ${followerCount} followers.`
      );
    }
  }
  console.log("Hoàn tất làm mới số liệu người theo dõi.");
};

module.exports = {
  refreshAllFollowerCounts,
};
