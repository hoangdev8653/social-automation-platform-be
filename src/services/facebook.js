const axios = require("axios");
const querystring = require("querystring");
const db = require("../models");

const GRAPH_API_BASE_URL = process.env.GRAPH_API_BASE_URL;
const CLIENT_ID = process.env.FB_CLIENT_ID;
const CLIENT_SECRET = process.env.FB_CLIENT_SECRET;

const REDIRECT_URI =
  process.env.FB_REDIRECT_URI ||
  "https://localhost:3007/api/v1/facebook/callback";

const getFacebookAuthUrl = () => {
  const authUrl = new URL("https://www.facebook.com/v20.0/dialog/oauth");
  authUrl.search = querystring.stringify({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope:
      "pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata",
    response_type: "code",
  });
  return authUrl.toString();
};

const getAccessToken = async (code) => {
  const url = `${GRAPH_API_BASE_URL}/oauth/access_token`;
  const params = {
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    client_secret: CLIENT_SECRET,
    code,
  };
  const res = await axios.get(url, { params });
  return res.data.access_token;
};

const getLongLivedUserAccessToken = async (shortLivedToken) => {
  const url = `${GRAPH_API_BASE_URL}/oauth/access_token`;
  const params = {
    grant_type: "fb_exchange_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    fb_exchange_token: shortLivedToken,
  };
  const res = await axios.get(url, { params });
  return res.data.access_token;
};

const getUserPages = async (accessToken) => {
  const res = await axios.get(`${GRAPH_API_BASE_URL}/me/accounts`, {
    params: {
      access_token: accessToken,
      fields: "id,name,fan_count,access_token,picture{url}",
    },
  });
  return res.data.data;
};

const bulkCreateOrUpdatePages = async (pages) => {
  try {
    // Sử dụng Promise.all để thực hiện các thao tác bất đồng bộ một cách song song
    const savedPages = await Promise.all(
      pages.map(async (page) => {
        // Dữ liệu chuẩn hóa cho page hiện tại
        const pageData = {
          platform_id: process.env.ID_PLATFORM_FACEBOOK,
          account_name: page.name,
          fan_counts: page.fan_count || 0,
          access_token: page.access_token,
          account_image: page.picture?.data?.url || null,
        };

        // Tìm một bản ghi có account_id trùng khớp
        const existingAccount = await db.SocialAccount.findOne({
          where: { account_id: page.id },
        });

        // Nếu đã tồn tại, cập nhật nó
        if (existingAccount) {
          await existingAccount.update(pageData);
          return existingAccount; // Trả về bản ghi đã cập nhật
        } else {
          // Nếu chưa tồn tại, tạo mới
          const newAccount = await db.SocialAccount.create({
            ...pageData,
            account_id: page.id, // Thêm account_id khi tạo mới
          });
          return newAccount; // Trả về bản ghi mới
        }
      })
    );

    return savedPages;
  } catch (error) {
    console.error("❌ Lỗi thêm/cập nhật:", error);
  }
};

module.exports = {
  getFacebookAuthUrl,
  getAccessToken,
  getLongLivedUserAccessToken,
  getUserPages,
  bulkCreateOrUpdatePages,
};
