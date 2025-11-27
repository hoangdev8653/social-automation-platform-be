const express = require("express");
const activityLogController = require("../controllers/activity_log.js");

const router = express.Router();

router.route("/").get(activityLogController.getAllActivityLogs);
router.route("/").post(activityLogController.createActivity);
router.route("/:id").delete(activityLogController.deleteActivity);

module.exports = router;
