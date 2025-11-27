const userRouter = require("./user.js");
const authRouter = require("./auth.js");
const platformRouter = require("./platform.js");
const socialaccountRouter = require("./socialaccount.js");
const mediaRouter = require("./media.js");
const postRouter = require("./post.js");
const postMediaRouter = require("./postMedia.js");
const postTargetRouter = require("./postTarget.js");
const notificationRouter = require("./notification.js");
const templateCategoryRouter = require("./templatecategory.js");
const templateRouter = require("./template.js");
const facebookRouter = require("./facbook.js");
const youtubeRouter = require("./youtube.js");
const xRouter = require("./x.js");
const aiMessageRouter = require("./ai_message.js");
const aiConversationRouter = require("./ai_conversation.js");
const analyticsRouter = require("./analytics.js");
const activityLogRouter = require("./activity_log.js");

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
  templateCategoryRouter,
  templateRouter,
  facebookRouter,
  youtubeRouter,
  xRouter,
  aiMessageRouter,
  aiConversationRouter,
  analyticsRouter,
  activityLogRouter,
};

module.exports = routers;
