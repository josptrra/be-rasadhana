## Instalasi

Jalankan perintah berikut untuk menginstal dependensi:

```bash
npm install
# atau
npm i
```

## Penggunaan

Untuk menjalankan aplikasi, gunakan perintah berikut:

```bash
npm start
```

## On Development

Berikut adalah daftar endpoint beserta request dan response yang tersedia dalam aplikasi ini:

### 1. **Register User**

**URL:** `POST /auth/register`  
**Endpoint:** [http://localhost:33000/auth/register](http://localhost:33000/auth/register)  
**Request:**

```json
{
  "name": "",
  "email": "",
  "password": ""
}
```

**Response:**

```json
{
  "success": true,
  "message": "Kode OTP telah dikirim ke email Anda",
  "otp": 123456
}
```

---

### 2. **Register OTP VERIFIER**

**URL:** `POST /auth/verify-register`  
**Endpoint:** [http://localhost:33000/auth/verify-register](http://localhost:33000/auth/verify-register)  
**Request:**

```json
{
  "email": "didallforus@gmail.com",
  "otp": "17519"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Pendaftaran berhasil, akun telah dibuat"
}
```

---

### 3. **Login User**

**URL:** `POST /auth/login-user`  
**Endpoint:** [http://localhost:33000/auth/login-user](http://localhost:33000/auth/login-user)  
**Request:**

```json
{
  "email": "",
  "password": ""
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login berhasil",
  "token": "",
  "expireToken": "2024-12-17T15:02:04.000Z"
}
```

---

### 4. **Get User Data**

**URL:** `GET /auth/userdata`  
**Endpoint:** [http://localhost:33000/auth/userdata](http://localhost:33000/auth/userdata)  
**Request: Headers:**

```json
{
  "Authorization": "Bearer JWT_TOKEN"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "675855ace760c04d86071194",
    "name": "juliooo",
    "email": "julioredf@gmail.com",
    "password": "",
    "photoUrl": "https://storage.googleapis.com/rasadhana-app-profile/default-profile.jpg",
    "resetToken": null,
    "registrationOtp": null,
    "otpExpiration": "2024-12-10T15:01:11.938Z",
    "__v": 0
  },
  "expireToken": "2024-12-17T15:02:04.000Z"
}
```

---

### 5. **Forgot Password**

**URL:** `POST /auth/forgot-password`  
**Endpoint:** [http://localhost:33000/auth/forgot-password](http://localhost:33000/auth/forgot-password)  
**Request:**

```json
{
  "email": ""
}
```

**Response:**

```json
{
  "success": true,
  "message": "email sent",
  "otp": ""
}
```

---

### 6. **Reset Password**

**URL:** `POST /auth/reset-password`  
**Endpoint:** [http://localhost:33000/auth/reset-password](http://localhost:33000/auth/reset-password)  
**Request:**

```json
{
  "otp": "",
  "newPassword": ""
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password berhasil direset"
}
```

---

### 7. **Update User by ID**

**URL:** `PATCH /auth/update/:userId`  
**Endpoint:** [http://localhost:33000/auth/update/:userId](http://localhost:33000/auth/update/:userId)
<br>

**Request: Body: form-data**

**Request:**

```json
1. Key = userId, type = text, value = userId
2. Key = photo, type = file, value = input file
3. Key = name, type = text, value = your name
```

**Response:**

```json
{
  "success": true,
  "message": "Profil user berhasil diperbarui",
  "user": {
    "_id": "67587279b73efb53e4761b38",
    "name": "Mizz Update",
    "email": "akumalaka63@gmail.com",
    "password": "$2b$10$SxYuppayqLDTREgrsawBHOQTISbdg3ZSq5iQcP7XcQz3nbYZ7qAy.",
    "photoUrl": "https://storage.googleapis.com/rasadhana-app-profile/cc01493c-6a04-4bea-b33d-3be0086c9f09_169.jpeg",
    "resetToken": null,
    "registrationOtp": "35602",
    "otpExpiration": "2024-12-10T17:04:59.949Z",
    "__v": 0
  }
}
```

---

### 9. **Delete User PFP - Back to default**

**URL:** `POST /auth/delete-profile-photo`  
**Endpoint:** [http://localhost:33000/auth/delete-profile-photo](http://localhost:33000/auth/delete-profile-photo)  
**Request:**

```json
{
  "userId": ""
}
```

**Response:**

```json
{
  "success": true,
  "message": "Foto profil berhasil dihapus",
  "photoUrl": "https://storage.googleapis.com/rasadhana-app-profile/default-profile.jpg"
}
```

---

### 10. **Upload Ingredients Photos**

**URL:** `Post /photos/upload-photo`  
**Endpoint:** [http://localhost:33000/photos/upload-photo](http://localhost:33000/auth/update/:userId)
**Request: Body: form-data**

```json
1. Key = photo, type = file, value = pilih foto
2. Key = userId, type = text, value = userId
```

**Response:**

```json
{
  "success": true,
  "message": "Foto berhasil diunggah",
  "photoUrl": "https://storage.googleapis.com/rasadhana-images/Screenshot 2023-02-16 112115.png"
}
```

---

### 11. **Get All Photos by UserID**

**URL:** `GET /photos/:userId`  
**Endpoint:** [http://localhost:33000/photos/:userId](http://localhost:33000/photos/:userId)
**Request: None.**

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "6745c8f85433b44440a475ab",
      "userId": "67448533910c1b9dc2387976",
      "photoUrl": "https://storage.googleapis.com/rasadhana-images/Screenshot 2022-12-21 030957.png",
      "uploadedAt": "2024-11-26T13:11:20.225Z",
      "__v": 0
    },
    {
      "_id": "6745d46f506e84cca2336c3a",
      "userId": "67448533910c1b9dc2387976",
      "photoUrl": "https://storage.googleapis.com/rasadhana-images/Screenshot 2023-02-16 112115.png",
      "uploadedAt": "2024-11-26T14:00:15.753Z",
      "__v": 0
    }
  ]
}
```

---

### 12. **POST CREATE Recipe - Homepage**

**URL:** `POST /recipes/create-recipe`  
**Endpoint:** [http://localhost:33000/recipes/create-recipe](http://localhost:33000/recipes/create-recipe)
**Request: Body: form-data**

```json
1. Key = title, type = text, value = judul resep
2. Key = ingredients, type = text, value = bahan bahan
3. Key = steps, type = text, value = langkah pengolahan
4. Key = recipeImages, type = file, value = gambar
```

**Response:**

```json
{
  "success": true,
  "message": "Resep berhasil diunggah",
  "recipeImageUrl": "https://storage.googleapis.com/rasadhana-app-images/recipes/1733212667546-ayam-goreng-tulang-lunak.jpg"
}
```

---

### 13. **GET All Recipe - Homepage**

**URL:** `GET /recipes/allrecipe`  
**Endpoint:** [http://localhost:33000/recipes/allrecipe](http://localhost:33000/recipes/allrecipe)
**Request: none**

**Response:**

```json
{
  "success": true,
  "recipes": [
    {
      "_id": "674eb9fbad215844949c2e9e",
      "title": "Ayam Goreng Tulang Lunak",
      "ingredients": "1 kg ayam  dipotong sesuai selera jangan kecil2 ya   2 batang serai  memarkan   4 lembar daun jeruk  7 butir bawang putih  haluskan   1 sdm ketumbar  haluskan   3 ruas jari laos  haluskan   3 ruas jari kunyit  haluskan   2 butir kemiri  haluskan   secukupnya garam  secukupnya air  tuk ukep ayam   secukupnya minyak goreng",
      "steps": "Haluskan bumbu2nya (BaPut, ketumbar, kemiri, kunyit, Laos, garam) hingga halus, sisihkan--Campur kan bumbu halus tadi dengan ayam yg sudah dicuci bersih dan sudah dipotong didalam panci presto. Uleni sampai tercampur rata.--Tambahkan air hingga ayam tenggelam semua. Masukkan serai dan daun jeruk nya kedalam rendaman ayam. Tutup panci presto rebus/ ukep presto sampai kurleb 45 menit. Dengan api sedang.--Setelah proses ukep presto selesai, tunggu suhu dingin ruang. Lalu goreng ayam dengan minyak goreng api sedang sampai ayam berwarna kecoklatan.--Matang dan sajikan ayam selagi hangat bersama nasi putih, sambal dgn perasan jeruk nipis, lalapan.",
      "recipeImage": "https://storage.googleapis.com/rasadhana-app-images/recipes/1733212667546-ayam-goreng-tulang-lunak.jpg",
      "__v": 0
    }
  ]
}
```

---
