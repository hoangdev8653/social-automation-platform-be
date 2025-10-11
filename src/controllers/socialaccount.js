const { StatusCodes } = require("http-status-codes");
const socialaccountService = require("../services/socialaccount.js");

const getAllSocialAccounts = async (req, res, next) => {
  try {
    const socialaccounts = await socialaccountService.getAllSocialAccounts();
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: socialaccounts,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getSocialAccountById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const socialaccount = await socialaccountService.getSocialAccountById(id);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: socialaccount,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const getSocialAccountByPlatform = async (req, res, next) => {
  try {
    const { platformId } = req.params;
    const socialaccounts =
      // Lấy tất cả tài khoản theo platform, không phân biệt người dùng
      await socialaccountService.getSocialAccountsByPlatform(platformId);
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xử lý thành công",
      content: socialaccounts,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const createSocialAccount = async (req, res, next) => {
  try {
    const {
      platform_id,
      account_name,
      account_id,
      account_image,
      access_token,
    } = req.body;

    const newSocialAccount = await socialaccountService.createSocialAccount({
      platform_id,
      account_name,
      account_id,
      account_image,
      access_token,
    });
    return res.status(StatusCodes.CREATED).json({
      status: 201,
      message: "Tạo tài khoản mạng xã hội thành công",
      content: newSocialAccount,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const updateSocialAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedSocialAccount = await socialaccountService.updateSocialAccount(
      id,
      data
    );
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Cập nhật tài khoản mạng xã hội thành công",
      content: updatedSocialAccount,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const deleteSocialAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedSocialAccount = await socialaccountService.deleteSocialAccount(
      id
    );
    return res.status(StatusCodes.OK).json({
      status: 200,
      message: "Xóa tài khoản mạng xã hội thành công",
      content: deletedSocialAccount,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = {
  getAllSocialAccounts,
  getSocialAccountById,
  getSocialAccountByPlatform,
  createSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
};
