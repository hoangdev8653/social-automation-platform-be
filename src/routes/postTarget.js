const express = require("express");
const router = express.Router();
const postTargetController = require("../controllers/postTarget.js");
const validateToken = require("../middlewares/auth.js");
const authorizeRoles = require("../middlewares/role.js");

router
  .route("/")
  .get(validateToken, postTargetController.getAllPostTargets)
  .post(
    validateToken,
    authorizeRoles("admin"),
    postTargetController.createPostTarget
  );

router
  .route("/:id")
  .put(
    validateToken,
    authorizeRoles("admin"),
    postTargetController.updatePostTarget
  )
  .delete(
    validateToken,
    authorizeRoles("admin"),
    postTargetController.deletePostTarget
  );

module.exports = router;
