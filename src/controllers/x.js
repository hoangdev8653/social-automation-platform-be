const xService = require("../services/x");
const {
  sendOAuthError,
  sendOAuthSuccess,
} = require("../utils/oauthResponse.js");

const tempStore = {};
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const getXAuthUrl = (req, res) => {
  const { authUrl, codeVerifier, state } = xService.getXAuthUrl();
  tempStore[state] = { codeVerifier };
  res.redirect(authUrl);
};

const handleXCallback = async (req, res) => {
  const { code, state } = req.query;

  const { codeVerifier } = tempStore[state] || {};

  // Xóa đi để tránh dùng lại
  delete tempStore[state];

  // 1. Kiểm tra state để đảm bảo request hợp lệ
  if (!state || !codeVerifier) {
    return res.status(400).send("<h3>Invalid state parameter.</h3>");
  }

  try {
    // 2. Dùng code và codeVerifier để lấy tokens
    const tokens = await xService.getTokens(code, codeVerifier);
    console.log(tokens);

    // 3. Dùng access_token để lấy thông tin người dùng
    const userInfo = await xService.getUserInfo(tokens.access_token);
    console.log(userInfo);

    // 4. Lưu thông tin vào database
    // Chú ý: bạn cần truyền user_id của người dùng đang đăng nhập vào hàm này
    const socialAccount = await xService.createOrUpdateXAccount(
      userInfo,
      tokens
    );

    sendOAuthSuccess(res, clientUrl, socialAccount, "Twitter");
  } catch (err) {
    console.error("X OAuth Error:", err.response?.data || err.message);

    sendOAuthError(res, err, "Twitter");
  }
};

module.exports = {
  getXAuthUrl,
  handleXCallback,
};
