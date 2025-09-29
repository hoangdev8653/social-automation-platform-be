const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.js");

router.route("/register").post(authController.register);
router.route("/login").post(authController.login);
router.route("/logout").post(authController.logout);
router.route("/refresh-token").post(authController.refreshToken);

module.exports = router;
