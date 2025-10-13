const express = require("express");
const router = express.Router();
const postController = require("../controllers/post.js");
const validateToken = require("../middlewares/auth.js");
const authorizeRoles = require("../middlewares/role.js");
const {uploadCloud} = require("../middlewares/cloudinary.js");

// Định nghĩa route để tạo bài viết mới
// POST /api/v1/posts
// GET /api/v1/posts
router
  .route("/")
  .get(validateToken, postController.getAllPosts)
  .post(validateToken, uploadCloud.array("files"), postController.createPost);

// DELETE /api/v1/posts/:id
router
  .route("/:id")
  .delete(validateToken, authorizeRoles("admin"), postController.deletePost);

// Route để admin duyệt bài viết
// PATCH /api/v1/posts/:id/approve
router
  .route("/:id/approve")
  .patch(validateToken, authorizeRoles("admin"), postController.approvePost);
router
  .route("/:id/reject")
  .patch(validateToken, authorizeRoles("admin"), postController.rejectPost);

module.exports = router;
