const db = require("../models");
const { generateResponse } = require("./ai_generate.js");

const getAllMessage = async () => {
  try {
    const message = await db.AI_message.findAll();
    return message;
  } catch (error) {
    throw error;
  }
};

const getMessageByConversation = async ({ conversationId }) => {
  try {
    const messages = await db.AI_message.findAll({
      where: { conversation_id: conversationId },
      order: [["createdAt", "ASC"]],
    });
    if (!messages) {
      throw Error("Không có đoạn chat!");
    }
    return messages;
  } catch (error) {
    throw error;
  }
};

const createMessage = async (userId, { conversation_id, content }) => {
  try {
    let currentConversationId = conversation_id;

    if (!currentConversationId) {
      // Nếu conversation_id không được cung cấp, tạo một cuộc hội thoại mới
      const conversation = await db.AI_conversation.create({
        user_id: userId,
        title: content,
        model: "google-gemini",
      });
      currentConversationId = conversation.id;
    }

    // Tạo tin nhắn AI với conversation_id đã xác định
    const userMessage = await db.AI_message.create({
      conversation_id: currentConversationId,
      role: "user",
      content,
    });

    // Lấy lịch sử hội thoại
    const conversationHistory = await db.AI_message.findAll({
      where: { conversation_id: currentConversationId },
      order: [["createdAt", "ASC"]],
    });

    // Định dạng lịch sử hội thoại cho Google Gemini
    const formattedHistory = conversationHistory.map((message) => ({
      role: message.role,
      parts: message.content,
    }));

    // Gọi Google Gemini API để lấy câu trả lời
    const aiResponse = await generateResponse(formattedHistory, content);

    const newMessage = await db.AI_message.create({
      conversation_id: currentConversationId,
      role: "model",
      content: aiResponse,
    });

    return newMessage;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllMessage,
  createMessage,
  getMessageByConversation,
};
