const youtubeService = require("../services/youtube.js");
const {
  sendOAuthError,
  sendOAuthSuccess,
} = require("../utils/oauthResponse.js");

const getYouTubeAuthUrl = (req, res) => {
  const authUrl = youtubeService.getYouTubeAuthUrl();
  console.log(authUrl);

  res.redirect(authUrl);
};

const handleYouTubeCallback = async (req, res) => {
  const { code } = req.query;
  try {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const tokens = await youtubeService.getTokens(code);
    console.log(tokens);

    const channel = await youtubeService.getUserChannel(tokens);

    if (!channel) {
      console.error("YouTube OAuth Error: No channel found for this user.");
      return res.status(404).send(`
        <script>
          window.opener.postMessage({
            type: 'oauth_error',
            platform: 'youtube',
            message: 'Không tìm thấy kênh YouTube nào cho tài khoản này. Vui lòng tạo một kênh và thử lại.'
          }, '${process.env.CLIENT_URL || "http://localhost:5173"}');
          window.close();
        </script>
      `);
    }

    const storedChannel = await youtubeService.createOrUpdateChannel(channel);
    const responseData = {
      type: "oauth_success",
      platform: "youtube",
      pages: storedChannel,
    };
    sendOAuthSuccess(res, clientUrl, responseData, "Youtube");
  } catch (err) {
    console.error("YouTube OAuth Error:", err.response?.data || err.message);
    sendOAuthError(res, err, "Youtube");
  }
};

module.exports = {
  getYouTubeAuthUrl,
  handleYouTubeCallback,
};
