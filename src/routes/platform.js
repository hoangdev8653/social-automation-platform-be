const express = require("express");
const router = express.Router();
const platformController = require("../controllers/platform.js");
const { uploadCloud } = require("../middlewares/cloudinary.js");

router.route("/").get(platformController.getAllPlatform);
router.route("/:id").get(platformController.getPlatformById);
router
  .route("/")
  .post(uploadCloud.single("image"), platformController.createPlatform);
router
  .route("/:id")
  .put(uploadCloud.single("image"), platformController.updatePlatform);
router.route("/:id").delete(platformController.deletePlatform);

module.exports = router;
