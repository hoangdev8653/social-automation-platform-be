const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const { corsOptions } = require("../src/config/cors.js");
const { connectDB } = require("./config/connectDB.js");
const routers = require("./routes/index.js");
const { startScheduler } = require("./scheduler.js");

dotenv.config();

const app = express();

connectDB();
// Middleware
app.use(express.json());
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan("dev"));
app.use(compression());

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Social Automation Platform Backend is running 🚀" });
});

app.use("/api/v1/user", routers.userRouter);
app.use("/api/v1/auth", routers.authRouter);
app.use("/api/v1/platform", routers.platformRouter);
app.use("/api/v1/media", routers.mediaRouter);
app.use("/api/v1/social-account", routers.socialaccountRouter);
app.use("/api/v1/post", routers.postRouter);
app.use("/api/v1/postMedia", routers.postMediaRouter);
app.use("/api/v1/postTarget", routers.postTargetRouter);
app.use("/api/v1/notification", routers.notificationRouter);
app.use("/api/v1/template-category", routers.templateCategoryRouter);
app.use("/api/v1/template", routers.templateRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startScheduler(); // Khởi động bộ lập lịch
});
