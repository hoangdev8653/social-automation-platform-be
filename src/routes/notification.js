const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.js");
const validateToken = require("../middlewares/auth.js");

router.route("/").get(validateToken, notificationController.getAllNotification);

router
  .route("/getByUser")
  .get(validateToken, notificationController.getAllNotificationsForUser);
router.route("/:id").get(notificationController.getNotificationById);
router.route("/").post(notificationController.createNotification);
router.route("/:id").patch(notificationController.updateStatusToRead);
router.route("/:id").delete(notificationController.deleteNotification);

module.exports = router;
