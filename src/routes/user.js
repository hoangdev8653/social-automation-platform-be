const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.js");
const authorizeRoles = require("../middlewares/role.js");

router.route("/").get(authorizeRoles("admin, user"), userController.getAllUser); // GET /api/users
router.route("/:id").get(userController.getUserById); // GET /api/users/123
router.route("/:id").put(userController.updateUser); // PUT /api/users/123
router.route("/:id/password").put(userController.updatePassword); // PUT /api/users/123/password
router
  .route("/:id/role")
  .put(authorizeRoles("admin"), userController.updateRole); // PUT /api/users/123/role
router.route("/:id").delete(authorizeRoles("admin"), userController.deleteUser); // DELETE /api/users/123

module.exports = router;
