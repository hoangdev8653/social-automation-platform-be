const cron = require("node-cron");
const analyticsService = require("./services/analytics.js");

const startScheduler = () => {
  // Lập lịch chạy công việc vào lúc 2 giờ sáng mỗi ngày.
  // Cú pháp: 'phút giờ ngày tháng thứ'.
  // Chạy tác vụ 4 giờ một lần (vào phút thứ 0 của giờ).
  // Ví dụ: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00.
  cron.schedule("0 */4 * * *", async () => {
    // cron.schedule("* * * * *", async () => {
    console.log(
      "Scheduler: Bắt đầu công việc cập nhật follower count hàng ngày."
    );
    await analyticsService.refreshAllFollowerCounts();
    console.log("Scheduler: Hoàn thành công việc cập nhật follower count.");
  });

  console.log("✅ Bộ lập lịch (Scheduler) đã được khởi động.");
};

module.exports = {
  startScheduler,
};
