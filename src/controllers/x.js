// d:\back-end\social-automation-platform\src\controllers\x.js
const xService = require("../services/x");

// Lưu trữ tạm thời, trong production nên dùng session hoặc cache (Redis)
const tempStore = {};

const getXAuthUrl = (req, res) => {
  const { authUrl, codeVerifier, state } = xService.getXAuthUrl();

  // Sử dụng 'state' làm key để lưu trữ codeVerifier.
  tempStore[state] = { codeVerifier };

  // Trả về URL cho frontend để redirect
  res.redirect(authUrl);
};

const handleXCallback = async (req, res) => {
  const { code, state } = req.query;

  // Lấy lại codeVerifier bằng 'state' từ query.
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

    // 5. Gửi thông báo thành công về cho cửa sổ popup của frontend
    res.send(`
      <script>
        window.opener.postMessage({
          type: 'oauth_success',
          platform: 'x',
          account: ${JSON.stringify(socialAccount)}
        }, '${process.env.CLIENT_URL || "http://localhost:5173"}');
        window.close();
      </script>
    `);
  } catch (err) {
    console.error("X OAuth Error:", err.response?.data || err.message);
    // Gửi thông báo lỗi về cho frontend
    res.status(500).send(`
      <script>
        window.opener.postMessage({
          type: 'oauth_error',
          platform: 'x',
          message: 'X authentication failed. Please try again.'
        }, '${process.env.CLIENT_URL || "http://localhost:5173"}');
        window.close();
      </script>
    `);
  }
};

module.exports = {
  getXAuthUrl,
  handleXCallback,
};
