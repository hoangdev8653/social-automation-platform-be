const express = require("express");
const router = express.Router();
const validateToken = require("../middlewares/auth.js");
const AIMessageController = require("../controllers/ai_message.js");

router.route("/").get(AIMessageController.getAllMessage);
router
  .route("/conversation/:conversationId")
  .get(AIMessageController.getMessageByConversation);
router.route("/").post(validateToken, AIMessageController.createMessage);
router.route("/:id").delete(validateToken, AIMessageController.deleteMessage);

module.exports = router;
