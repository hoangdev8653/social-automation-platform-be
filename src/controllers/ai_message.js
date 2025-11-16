const { StatusCodes } = require("http-status-codes");
const aiMessageService = require("../services/ai_message.js");

const getAllMessage = async (req, res, next) => {
  try {
    const message = await aiMessageService.getAllMessage();
    return res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", content: message });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getMessageByConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const message = await aiMessageService.getMessageByConversation({
      conversationId,
    });
    return res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", content: message });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const createMessage = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { conversation_id, content } = req.body;
    const message = await aiMessageService.createMessage(userId, {
      conversation_id,
      content,
    });
    return res
      .status(StatusCodes.CREATED)
      .json({ status: 201, message: "Xử lý thành công", content: message });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = await aiMessageService.deleteMessage(id);
    return res
      .status(StatusCodes.OK)
      .json({ status: 200, message: "Xử lý thành công", content: message });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  getAllMessage,
  getMessageByConversation,
  createMessage,
  deleteMessage,
};
