const facebookService = require("../services/facebook.js");
const {
  sendOAuthSuccess,
  sendOAuthError,
} = require("../utils/oauthResponse.js");

const getFacebookAuthUrl = async (req, res, next) => {
  const authUrl = facebookService.getFacebookAuthUrl();
  res.redirect(authUrl);
};

const handleFacebookCallback = async (req, res) => {
  const { code } = req.query;

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  try {
    const shortLivedToken = await facebookService.getAccessToken(code);
    const longLivedToken = await facebookService.getLongLivedUserAccessToken(
      shortLivedToken
    );
    let pages = await facebookService.getUserPages(longLivedToken);
    const storedPages = await facebookService.bulkCreateOrUpdatePages(pages);

    const responseData = {
      type: "oauth_success",
      platform: "facebook",
      pages: storedPages,
    };

    sendOAuthSuccess(res, clientUrl, responseData, "Facebook");
  } catch (err) {
    console.error("Facebook OAuth Error:", err.response?.data || err);

    sendOAuthError(res, err, "Facebook");
  }
};

module.exports = {
  getFacebookAuthUrl,
  handleFacebookCallback,
};
