# Gunakan Node.js versi LTS sebagai base image
FROM node:18

# Set working directory di dalam container
WORKDIR /app

# Tentukan environment variable PORT
ENV PORT=8080

# Salin package.json dan package-lock.json (jika ada)
COPY package*.json ./

RUN npm install

# Salin seluruh kode aplikasi ke dalam container
COPY . .

# Expose port sesuai dengan port yang digunakan oleh aplikasi Express
EXPOSE 8080

# Jalankan aplikasi saat container dijalankan
CMD ["npm", "run", "start"]

