# Gunakan image Node.js versi LTS
FROM node:18

# Buat folder kerja di container
WORKDIR /app

# Copy file dependency jika ada
COPY package*.json ./
RUN npm install

# Salin semua file ke container
COPY . .

# Default command bisa di-overwrite di docker-compose.yml
CMD ["node", "draw.js"]
