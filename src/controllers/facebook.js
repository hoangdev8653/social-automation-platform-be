const facebookService = require("../services/facebook.js");

const getFacebookAuthUrl = async (req, res, next) => {
  const authUrl = facebookService.getFacebookAuthUrl();
  res.redirect(authUrl);
};

const handleFacebookCallback = async (req, res) => {
  const { code } = req.query;
  try {
    const shortLivedToken = await facebookService.getAccessToken(code);
    const longLivedToken = await facebookService.getLongLivedUserAccessToken(
      shortLivedToken
    );
    let pages = await facebookService.getUserPages(longLivedToken);
    const storedPages = await facebookService.bulkCreateOrUpdatePages(pages);

    res.send(`
      <script>
        window.opener.postMessage({
          type: 'oauth_success', // Sử dụng một type chung
          platform: 'facebook',    // Thêm platform để front-end biết nguồn
          pages: ${JSON.stringify(
            storedPages
          )} // Chỉ gửi dữ liệu đã làm sạch về frontend
        }, '${process.env.CLIENT_URL || "http://localhost:5173"}');
        window.close();
      </script>
    `);
  } catch (err) {
    console.error("Facebook OAuth Error:", err.response?.data || err);
    res.send("<h3>Đăng nhập thất bại!</h3>");
  }
};

module.exports = {
  getFacebookAuthUrl,
  handleFacebookCallback,
};
