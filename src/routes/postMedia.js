const express = require("express");
const postMediaController = require("../controllers/postMedia.js");
const router = express.Router();

router
  .route("/")
  .get(postMediaController.getAllPostMedia)
  .post(postMediaController.createPostMedia);

router
  .route("/:id")
  .get(postMediaController.getPostMediaById)
  .put(postMediaController.updatePostMedia)
  .delete(postMediaController.deletePostMedia);

module.exports = router;
