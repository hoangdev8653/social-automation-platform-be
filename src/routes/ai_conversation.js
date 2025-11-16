const express = require("express");
const router = express.Router();
const validateToken = require("../middlewares/auth.js");
const AIConversationController = require("../controllers/ai_conversation.js");

router.route("/").get(AIConversationController.getAllConversation);
router
  .route("/Byuser")
  .get(validateToken, AIConversationController.getConversationByUser);
router.route("/:id").get(AIConversationController.getConversationById);
router
  .route("/:id")
  .delete(validateToken, AIConversationController.deleteConversation);

module.exports = router;
