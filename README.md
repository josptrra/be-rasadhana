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
  "status": "Success",
  "data": "User telah didaftarkan"
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
  "message": "Login success",
  "data": ""
}
```

---

### 3. **Get User Data**
**URL:** `POST /auth/userdata`  
**Endpoint:** [http://localhost:33000/auth/userdata](http://localhost:33000/auth/userdata)  
**Request:**
```json
{
  "token": ""
}
```
**Response:**
```json
{
  "status": "ok",
  "data": {
    "_id": "6741b6fc61ae0a167581214e",
    "name": "Julio",
    "email": "juliosp2107@gmail.com",
    "password": "$2b$10$1e53JamkTVau7fAfQwhi9.SyBNloHjR1pqjI7kOV0Z9ioVDV4tvfG",
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
  "status": true,
  "message": "email sent",
  "token": "24938"
}
```

---

### 5. **Reset Password**
**URL:** `POST /auth/reset-password`  
**Endpoint:** [http://localhost:33000/auth/reset-password](http://localhost:33000/auth/reset-password)  
**Request:**
```json
{
  "token": "",
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
**Request:**
```json
{
  "name": "",
  "email": ""
}
```
**Response:**
```json
{
  "message": "Berhasil update",
  "user": {
    "_id": "6741b6fc61ae0a167581214e",
    "name": "Updated Name",
    "email": "updated_email@gmail.com"
  }
}
```

---
