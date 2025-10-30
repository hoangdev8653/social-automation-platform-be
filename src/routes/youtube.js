const express = require("express");
const router = express.Router();
const youtubeController = require("../controllers/youtube.js");

router.route("/").get(youtubeController.getYouTubeAuthUrl);
router.route("/callback").get(youtubeController.handleYouTubeCallback);

module.exports = router;
