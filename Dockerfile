# Gunakan Node.js versi LTS sebagai base image
FROM node:18

# Set working directory di dalam container
WORKDIR /app

# Salin package.json dan package-lock.json (jika ada)
COPY package*.json ./

# Install dependencies
RUN npm install

# Salin seluruh kode aplikasi ke dalam container
COPY . .

# Expose port sesuai dengan port yang digunakan oleh aplikasi Express
EXPOSE 8080

# Jalankan aplikasi saat container dijalankan
CMD ["npm", "run", "start"]
