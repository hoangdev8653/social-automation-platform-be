const cron = require("node-cron");
const analyticsService = require("./services/analytics.js");

const startScheduler = () => {
  // Lập lịch chạy công việc vào lúc 2 giờ sáng mỗi ngày.
  // Cú pháp: 'phút giờ ngày tháng thứ'
  cron.schedule("0 2 * * *", async () => {
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
