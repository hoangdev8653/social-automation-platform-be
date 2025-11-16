const db = require("../models");

const getAllConversation = async () => {
  try {
    const conversation = await db.AI_conversation.findAll({
      include: [
        {
          model: db.User,
          as: "user", // alias được định nghĩa trong model AI_conversation
          attributes: ["id", "name", "email"], // Chỉ lấy các trường cần thiết
        },
      ],
      order: [["createdAt", "DESC"]], // Sắp xếp các cuộc hội thoại mới nhất lên đầu
    });

    return conversation;
  } catch (error) {
    throw error;
  }
};

const getConversationById = async (id) => {
  try {
    const conversation = await db.AI_conversation.findByPk(id);
    if (!conversation) {
      throw new Error("Không tìm thấy đoạn hội thoại");
    }
    return conversation;
  } catch (error) {
    throw error;
  }
};
const getConversationByUser = async (userId) => {
  try {
    const conversations = await db.AI_conversation.findAll({
      where: {
        user_id: userId,
      },
      order: [["createdAt", "DESC"]],
    });
    return conversations;
  } catch (error) {
    throw error;
  }
};

const deleteConversation = async (id) => {
  try {
    const conversation = await db.AI_conversation.findByPk(id);
    if (!conversation) {
      throw error("Không tìm thấy đoạn hội thoại");
    }
    const deleted = await conversation.destroy();
    return deleted;
  } catch (error) {
    throw error;
  }
};
module.exports = {
  getAllConversation,
  getConversationById,
  getConversationByUser,
  deleteConversation,
};
