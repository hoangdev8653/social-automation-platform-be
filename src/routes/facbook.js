const express = require("express");
const router = express.Router();
const facebookController = require("../controllers/facebook.js");

router.route("/").get(facebookController.getFacebookAuthUrl);
router.route("/callback").get(facebookController.handleFacebookCallback);

module.exports = router;
