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
  "message": "User telah didaftarkan"
}
```

---

### 2. **Login User**

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
  "data": "JWT_TOKEN"
}
```

---

### 3. **Get User Data**

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
    "_id": "6741b6fc61ae0a167581214e",
    "name": "Julio",
    "email": "juliosp2107@gmail.com",
    "__v": 0,
    "resetToken": "24938"
  }
}
```

---

### 4. **Forgot Password**

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

### 5. **Reset Password**

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

### 6. **Update User by ID**

**URL:** `PATCH /auth/update/:userId`  
**Endpoint:** [http://localhost:33000/auth/update/:userId](http://localhost:33000/auth/update/:userId)
**Request: Headers:**

```json
{
  "Authorization": "Bearer JWT_TOKEN"
}
```

**Request:**

```json
{
  "name": "Nama Baru"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "_id": "6741b6fc61ae0a167581214e",
    "name": "Julio Syah Putraaaa",
    "email": "juliosp2107@gmail.com",
    "password": "$2b$10$of8QqcmRUV/.MVtgxC8LjOm3l8RqBtZtpNV1gvIRZ5cHVNMV1xg2.",
    "__v": 0,
    "resetToken": null
  },
  "message": "Nama berhasil diupdate"
}
```

### 7. **Upload Photos**

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

### 8. **Get All Photos by UserID**

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
