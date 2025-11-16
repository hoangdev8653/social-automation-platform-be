const { StatusCodes } = require("http-status-codes");
const aiConversationService = require("../services/ai_conversation.js");

const getAllConversation = async (req, res, next) => {
  try {
    const conversation = await aiConversationService.getAllConversation();
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: conversation,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getConversationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await aiConversationService.getConversationById(id);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: conversation,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getConversationByUser = async (req, res, next) => {
  try {
    const userId = req.userId;
    const conversation = await aiConversationService.getConversationByUser(
      userId
    );
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: conversation,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const deleteConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await aiConversationService.deleteConversation(id);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: conversation,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  getAllConversation,
  getConversationById,
  getConversationByUser,
  deleteConversation,
};
