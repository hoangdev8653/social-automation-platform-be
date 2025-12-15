/**
 * Trả về giao diện HTML thông báo kết nối thành công và gửi postMessage về Client
 * @param {Object} res - Express response object
 * @param {String} clientUrl - URL của frontend (để check origin)
 * @param {Object} data - Dữ liệu cần gửi về frontend (token, pages, v.v.)
 * @param {String} platformName - Tên nền tảng (Facebook, TikTok...) để hiển thị
 */
const sendOAuthSuccess = (res, clientUrl, data, platformName = "Nền tảng") => {
  // Thiết lập CSP để cho phép inline script hoạt động
  res.set("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");

  const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kết nối ${platformName} thành công</title>
        <style>
          body {
            font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            height: 100vh; margin: 0; background-color: #f3f4f6; color: #1f2937;
          }
          .card {
            background: white; padding: 2rem; border-radius: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            text-align: center; max-width: 400px; width: 90%;
          }
          .icon-success { color: #059669; font-size: 48px; margin-bottom: 1rem; }
          .btn {
            margin-top: 15px; padding: 10px 20px; background: #e5e7eb; 
            border: none; border-radius: 6px; cursor: pointer; color: #374151; font-weight: 500;
          }
          .btn:hover { background: #d1d5db; }
          .loader {
            border: 3px solid #f3f3f3; border-top: 3px solid #3b82f6; border-radius: 50%;
            width: 20px; height: 20px; animation: spin 1s linear infinite; margin: 15px auto;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-success">✅</div>
          <h2>Kết nối ${platformName} thành công!</h2>
          <p>Đang đồng bộ dữ liệu. Cửa sổ sẽ đóng sau <span id="timer">5</span>s...</p>
          <div class="loader"></div>
          <button id="closeBtn" class="btn">Đóng ngay</button>
        </div>

        <script>
          function finish() {
             try {
                if (window.opener) {
                   window.opener.postMessage(${JSON.stringify(data).replace(
                     /</g,
                     "\\u003c"
                   )}, '${clientUrl}');
                   console.log('Message sent successfully');
                } else {
                   console.warn('No window.opener found');
                }
             } catch (e) {
                console.error('Error sending message:', e);
             }
             
             let count = 5;
             const timer = document.getElementById('timer');
             setInterval(() => { if(count > 0) timer.innerText = --count; }, 1000);

             setTimeout(function() {
                window.close();
             }, 5000);
          }

          document.getElementById('closeBtn').addEventListener('click', function() {
             window.close();
          });

          finish();
        </script>
      </body>
      </html>
    `;

  res.send(html);
};

/**
 * Trả về giao diện HTML thông báo lỗi
 * @param {Object} res - Express response object
 * @param {Error} err - Object lỗi
 * @param {String} platformName - Tên nền tảng
 */
const sendOAuthError = (res, err, platformName = "Nền tảng") => {
  res.set("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");

  const errorMessage = err.message || "Lỗi không xác định";

  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kết nối thất bại</title>
        <meta charset="UTF-8">
        <style>
           body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #fef2f2; margin: 0; }
           .card { background: white; padding: 2rem; border-radius: 1rem; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 90%; max-width: 400px;}
           h2 { color: #dc2626; margin-top: 0; }
           button { background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 15px; font-weight: bold;}
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
          <h2>Kết nối ${platformName} thất bại!</h2>
          <p style="color: #4b5563;">Đã xảy ra lỗi khi kết nối.</p>
          <p style="font-size: 13px; color: #ef4444; background: #fee2e2; padding: 8px; border-radius: 4px; word-break: break-word;">
            ${errorMessage}
          </p>
          <button onclick="window.close()">Đóng cửa sổ</button>
        </div>
      </body>
      </html>
    `;

  res.send(html);
};

module.exports = {
  sendOAuthSuccess,
  sendOAuthError,
};
