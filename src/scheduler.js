const cron = require("node-cron");
const analyticsService = require("./services/analytics.js");
const postService = require("./services/post.js"); // Import post service

const startScheduler = () => {
  // Chạy tác vụ 4 giờ một lần (vào phút thứ 0 của giờ).
  // Ví dụ: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00.
  cron.schedule("0 */4 * * *", async () => {
    console.log("[Scheduler] Bắt đầu công việc cập nhật follower count.");
    try {
      await analyticsService.refreshAllFollowerCounts();
      console.log("[Scheduler] Hoàn thành công việc cập nhật follower count.");
    } catch (error) {
      console.error("[Scheduler] Lỗi khi cập nhật follower count:", error);
    }
  });

  // Chạy mỗi phút để kiểm tra và đăng các bài viết đã được lên lịch.
  cron.schedule("* * * * *", async () => {
    console.log("[Scheduler] Đang kiểm tra các bài viết đến lịch đăng...");
    try {
      await postService.processScheduledPostsToPublish();
    } catch (error) {
      console.error(
        "[Scheduler] Đã xảy ra lỗi trong quá trình xử lý bài viết đến lịch đăng:",
        error
      );
    }
  });

  console.log("✅ Bộ lập lịch (Scheduler) đã được khởi động.");
};

module.exports = {
  startScheduler,
};
