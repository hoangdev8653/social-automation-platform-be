const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const dotenv = require("dotenv");

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "social-automation-platform",
      resource_type: "auto",
    };
  },
});

const fileFilter = (req, file, cb) => {
  // Chấp nhận các loại file ảnh, video và âm thanh phổ biến
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "audio/mpeg", // for mp3
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true); // Chấp nhận file
  } else {
    // Từ chối file
    cb(
      new Error(
        "Định dạng file không hợp lệ. Chỉ chấp nhận ảnh, video và file mp3."
      ),
      false
    );
  }
};

const uploadCloud = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 20 }, // Giới hạn kích thước file là 20MB
});

const deleteFromCloud = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
  } catch (error) {
    console.error(`Lỗi khi xóa file ${publicId} từ Cloudinary:`, error);
  }
};

module.exports = { uploadCloud, deleteFromCloud };
