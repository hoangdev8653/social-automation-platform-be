const Joi = require("joi");

const createUser = {
  body: Joi.object().keys({
    name: Joi.string().required().messages({
      "string.empty": "Tên không được để trống",
      "any.required": "Tên là trường bắt buộc",
    }),
    email: Joi.string().required().email().messages({
      "string.empty": "Email không được để trống",
      "string.email": "Email không đúng định dạng",
      "any.required": "Email là trường bắt buộc",
    }),
    password: Joi.string().required().min(6).messages({
      "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
      "any.required": "Mật khẩu là trường bắt buộc",
    }),
  }),
};

module.exports = {
  createUser,
};
