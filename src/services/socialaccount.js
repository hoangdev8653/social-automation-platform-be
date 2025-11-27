const db = require("../models");
const ApiError = require("../utils/ApiError");

const getAllSocialAccounts = async (paginationOptions) => {
  try {
    const page = parseInt(paginationOptions.page, 10);
    const limit = parseInt(paginationOptions.limit, 10);
    const offset = (page - 1) * limit;
    const { count: totalItem, rows: socialaccounts } =
      await db.SocialAccount.findAndCountAll({
        offset: offset,
        limit: limit,
        distinct: true,
        col: "id",
        include: [
          {
            model: db.Platform,
            as: "platform",
            attributes: ["id", "name", "image"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
    const totalPages = Math.ceil(totalItem / limit);

    return {
      socialaccounts,
      totalPages,
      currentPage: page,
      totalItem,
    };
  } catch (error) {
    throw error;
  }
};

const getSocialAccountById = async (id) => {
  try {
    const socialaccount = await db.SocialAccount.findByPk(id, {
      include: [
        {
          model: db.Platform,
          as: "platform",
          attributes: ["id", "name", "image"],
        },
      ],
    });
    if (!socialaccount) {
      throw new ApiError(404, "Tài khoản mạng xã hội không tồn tại");
    }
    return socialaccount;
  } catch (error) {
    throw error;
  }
};

const getSocialAccountsByPlatform = async (platformId) => {
  try {
    const socialaccounts = await db.SocialAccount.findAll({
      where: { platform_id: platformId },
      include: [
        {
          model: db.Platform,
          as: "platform",
          attributes: ["id", "name", "image"],
        },
      ],
    });
    return socialaccounts;
  } catch (error) {
    throw error;
  }
};
const createSocialAccount = async ({
  platform_id,
  account_name,
  account_id,
  account_image,
  access_token,
}) => {
  try {
    const newSocialAccount = await db.SocialAccount.create({
      platform_id,
      account_name,
      account_id,
      account_image,
      access_token,
    });
    return newSocialAccount;
  } catch (error) {
    throw error;
  }
};

const updateSocialAccount = async (id, data) => {
  try {
    const socialaccount = await db.SocialAccount.findByPk(id);
    if (!socialaccount) {
      throw new ApiError(404, "Tài khoản mạng xã hội không tồn tại");
    }
    await socialaccount.update(data);
    return socialaccount;
  } catch (error) {
    throw error;
  }
};

const deleteSocialAccount = async (id) => {
  try {
    const socialaccount = await db.SocialAccount.findByPk(id);
    if (!socialaccount) {
      throw new ApiError(404, "Tài khoản mạng xã hội không tồn tại");
    }
    const deleted = await socialaccount.destroy();
    return deleted;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllSocialAccounts,
  getSocialAccountById,
  getSocialAccountsByPlatform,
  createSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
};
