// d:\back-end\social-automation-platform\src\routes\x.js
const express = require("express");
const xController = require("../controllers/x");

const router = express.Router();

// Route 1: Bắt đầu quá trình xác thực
// Frontend sẽ gọi GET /api/v1/x/auth
// Controller sẽ trả về một URL xác thực của Twitter
router.get("/", xController.getXAuthUrl);

// Route 2: Xử lý callback từ Twitter
// Sau khi người dùng đồng ý, Twitter sẽ chuyển hướng về GET /api/v1/x/callback
// Controller sẽ xử lý lấy token và thông tin người dùng
router.get("/callback", xController.handleXCallback);

module.exports = router;
