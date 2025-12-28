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
      const conversation = await db.AI_conversation.create({
        user_id: userId,
        title: content,
        model: "google-gemini",
      });
      currentConversationId = conversation.id;
    }

    const userMessage = await db.AI_message.create({
      conversation_id: currentConversationId,
      role: "user",
      content,
    });

    const conversationHistory = await db.AI_message.findAll({
      where: { conversation_id: currentConversationId },
      order: [["createdAt", "ASC"]],
    });

    const formattedHistory = conversationHistory.map((message) => ({
      role: message.role,
      parts: message.content,
    }));

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
