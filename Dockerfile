# Sử dụng một image Node.js chính thức làm image cơ sở
FROM node:18-alpine

# Tạo và chỉ định thư mục làm việc bên trong container
WORKDIR /app

# Sao chép package.json và package-lock.json (hoặc yarn.lock)
COPY package*.json ./

# Cài đặt các dependencies của dự án
# Nếu bạn dùng yarn, hãy thay 'npm install' bằng 'yarn install'
RUN npm install 

# Sao chép toàn bộ mã nguồn của dự án vào thư mục làm việc
COPY . .

# Expose cổng mà ứng dụng của bạn sẽ chạy
EXPOSE 3007

# Lệnh để chạy ứng dụng khi container khởi động
CMD [ "npm", "start" ]