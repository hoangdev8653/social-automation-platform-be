const userRouter = require("./user.js");
const authRouter = require("./auth.js");
const platformRouter = require("./platform.js");
const socialaccountRouter = require("./socialaccount.js");
const mediaRouter = require("./media.js");
const postRouter = require("./post.js");
const postMediaRouter = require("./postMedia.js");
const postTargetRouter = require("./postTarget.js");
const notificationRouter = require("./notification.js");

const routers = {
  userRouter,
  authRouter,
  platformRouter,
  socialaccountRouter,
  mediaRouter,
  postRouter,
  postMediaRouter,
  postTargetRouter,
  notificationRouter,
};

module.exports = routers;
