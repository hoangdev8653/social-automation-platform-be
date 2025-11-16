const { GoogleGenAI } = require("@google/genai");

// Khởi tạo SDK
// Cảnh báo: Không nên hardcode API key.
const genAI = new GoogleGenAI({
  apiKey:
    process.env.API_KEY_GOOGLE_GEMINI ||
    "AIzaSyCSpF2qFJHiNpBxGpNNvqw64BvrbtGvkto", // <-- Cẩn thận lộ key!
});

// Hàm sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gửi yêu cầu đến Google Gemini API với retry logic
 * (Phiên bản test streaming, sẽ in chunk ra console)
 */
const generateResponse = async (conversationHistory, newMessage) => {
  // Danh sách models để thử
  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp",
    "gemini-exp-1206",
    "gemini-2.5-pro-preview-03-25",
  ];
  const maxRetries = 2; // Số lần thử lại cho MỖI model

  // Chỉ thị hệ thống
  const systemInstruction = `
Bạn là một trợ lý AI chuyên viết nội dung mạng xã hội cho nền tảng Social Automation Platform.

🎯 Nhiệm vụ:
- Viết nội dung ngắn gọn, hấp dẫn, đúng mục đích mà người dùng yêu cầu.
- Tùy chỉnh phong cách, tone và độ dài phù hợp với từng nền tảng (Facebook, Instagram, Twitter, YouTube...).
- Nếu không chỉ định nền tảng, hãy viết nội dung trung lập, có thể dùng được ở nhiều nơi.
- Ưu tiên tạo caption súc tích kèm 3–5 hashtag liên quan, không trùng lặp, có thể thêm emoji nhẹ nhàng nếu hợp ngữ cảnh.
- Nếu người dùng yêu cầu hình ảnh hoặc video, chỉ cần gợi ý nội dung mô tả cho media (không tạo file thật).
- Nếu có nhiều nền tảng (ví dụ: Facebook, Instagram, Twitter), hãy viết nội dung riêng biệt cho từng nền tảng.
- Luôn trả lời trực tiếp, không giải thích, không thêm lời chào hay mô tả AI.
`;

  // 1. Định dạng System Instruction theo chuẩn
  const systemInstructionObject = {
    parts: [{ text: systemInstruction }],
  };

  // 2. Xây dựng lịch sử hội thoại (contents) dạng mảng
  const chatHistory = [];

  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach((msg) => {
      const role = msg.role === "user" ? "user" : "model";
      const content = msg.content || msg.parts || ""; // Lấy nội dung

      chatHistory.push({
        role: role,
        parts: [{ text: content }],
      });
    });
  }

  // 3. Thêm tin nhắn mới nhất của người dùng vào mảng
  chatHistory.push({
    role: "user",
    parts: [{ text: newMessage }],
  });

  // Vòng lặp thử model (Logic của bạn)
  for (const modelName of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `\n🔄 Thử model: ${modelName} (lần ${attempt}/${maxRetries})`
        );

        // Gọi API với cấu trúc mới
        const response = await genAI.models.generateContentStream({
          model: modelName,
          systemInstruction: systemInstructionObject, // Dùng đối tượng chỉ thị
          contents: chatHistory, // Dùng mảng hội thoại
        });

        let fullText = "";

        console.log("--- BẮT ĐẦU NHẬN STREAM ---");

        // Vòng lặp stream
        for await (const chunk of response) {
          const chunkText = chunk.text || "";
          if (chunkText) {
            // ⭐ TEST STREAMING: In ra terminal ngay lập tức
            process.stdout.write(chunkText);

            fullText += chunkText;
          }
        }

        // Thêm một dòng mới sau khi stream kết thúc
        console.log("\n--- KẾT THÚC STREAM ---");

        if (!fullText || fullText.trim() === "") {
          throw new Error("Không nhận được phản hồi từ API");
        }

        console.log(`\n✅ Thành công với model: ${modelName}`);
        return fullText.trim();
      } catch (error) {
        // Toàn bộ logic xử lý lỗi của bạn được giữ nguyên
        const errorMsg = error.message || JSON.stringify(error);
        console.error(`\n❌ Lỗi với model ${modelName}:`, errorMsg);

        // Xử lý lỗi 429 - Quota exceeded
        if (
          error.status === 429 ||
          errorMsg.includes("429") ||
          errorMsg.includes("quota")
        ) {
          const retryMatch = errorMsg.match(/retry[^0-9]*(\d+)/i);
          const retrySeconds = retryMatch ? parseFloat(retryMatch[1]) : 60;
          console.log(`⚠️ Vượt quota! Phải đợi ${Math.ceil(retrySeconds)}s`);

          if (retrySeconds < 10 && attempt < maxRetries) {
            console.log(`⏳ Đợi ${Math.ceil(retrySeconds)}s...`);
            await sleep(retrySeconds * 1000);
            continue;
          }

          console.log(`⏭️ Thử model khác...`);
          break; // Thoát vòng lặp 'attempt', thử model tiếp theo
        }

        // Xử lý lỗi 503 - Overloaded
        if (error.status === 503 && attempt < maxRetries) {
          const delayMs = attempt * 2000;
          console.log(`⏳ Server quá tải, đợi ${delayMs / 1000}s...`);
          await sleep(delayMs);
          continue; // Thử lại 'attempt'
        }

        // Xử lý lỗi 500 - Internal error
        if (error.status === 500 && attempt < maxRetries) {
          console.log(`⏳ Lỗi server, thử lại...`);
          await sleep(1000);
          continue; // Thử lại 'attempt'
        }

        // Các lỗi khác, thử model tiếp theo
        console.log(`⏭️ Thử model khác...`);
        break; // Thoát vòng lặp 'attempt', thử model tiếp theo
      }
    }
  }

  // Lỗi cuối cùng nếu tất cả model đều thất bại
  throw new Error(
    "❌ Không thể kết nối với Gemini API. Có thể do vượt quota hoặc API key không hợp lệ.\n" +
      "Vui lòng kiểm tra lại khóa API hoặc đợi 1 phút trước khi thử lại."
  );
};

// Xuất module
module.exports = {
  generateResponse,
};

// --- CÁCH TEST (VÍ DỤ) ---
// Bạn có thể thêm đoạn code này vào cuối file để chạy test trực tiếp
/*
(async () => {
  try {
    console.log("Đang chạy test...");
    const history = []; // Lịch sử trống
    const newMessage = "Viết 1 caption facebook về cà phê buổi sáng";
    
    const response = await generateResponse(history, newMessage);
    
    console.log("\n--- KẾT QUẢ CUỐI CÙNG TRẢ VỀ ---");
    console.log(response);

  } catch (error) {
    console.error("\n--- LỖI CUỐI CÙNG ---");
    console.error(error.message);
  }
})();
*/
