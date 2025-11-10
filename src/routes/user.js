const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.js");
const authorizeRoles = require("../middlewares/role.js");
const validateToken = require("../middlewares/auth.js");

router
  .route("/")
  .get(validateToken, authorizeRoles("admin"), userController.getAllUser); // GET /api/users
router.route("/:id").get(userController.getUserById); // GET /api/users/123
router
  .route("/update-password")
  .put(validateToken, userController.updatePassword);
router.route("/:id").put(userController.updateUser);

router
  .route("/update-role/:id")
  .put(validateToken, authorizeRoles("user"), userController.updateRole);
router
  .route("/reset-password/:id")
  .put(validateToken, authorizeRoles("admin"), userController.resetPassword);
router
  .route("/lock-account/:id")
  .put(validateToken, authorizeRoles("admin"), userController.lockAccount);
router.route("/:id").delete(authorizeRoles("admin"), userController.deleteUser);

module.exports = router;
