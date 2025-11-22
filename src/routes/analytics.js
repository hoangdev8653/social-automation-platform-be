const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.js");

router.route("/overview").get(analyticsController.getAnalyticOverview);
router.route("/all-posts").get(analyticsController.getAllPostsEngagement);

module.exports = router;
