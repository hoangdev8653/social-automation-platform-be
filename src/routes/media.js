const express = require("express");
const router = express.Router();
const mediaController = require("../controllers/media.js");

router.route("/").get(mediaController.getAllMedia); // GET /api/media
router.route("/:id").get(mediaController.getMediaById);
router.route("/").post(mediaController.createMedia);
router.route("/:id").put(mediaController.updateMedia);
router.route("/:id").delete(mediaController.deleteMedia);

module.exports = router;
