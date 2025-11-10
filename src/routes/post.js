const express = require("express");
const router = express.Router();
const postController = require("../controllers/post.js");
const validateToken = require("../middlewares/auth.js");
const authorizeRoles = require("../middlewares/role.js");
const { uploadCloud } = require("../middlewares/cloudinary.js");

router.route("/ByUser").get(validateToken, postController.getPostByUser);

router.route("/").get(postController.getAllPosts);
router.route("/:id").get(postController.getPostById);
router
  .route("/")
  .post(validateToken, uploadCloud.array("files"), postController.createPost);

router
  .route("/:id/approve")
  .patch(validateToken, authorizeRoles("admin"), postController.approvePost);
router
  .route("/:id/reject")
  .patch(validateToken, authorizeRoles("admin"), postController.rejectPost);
router
  .route("/:id")
  .delete(validateToken, authorizeRoles("admin"), postController.deletePost);

module.exports = router;
