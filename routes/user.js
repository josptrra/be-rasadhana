import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import { User } from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const storage = new Storage();
const bucketName = process.env.GCLOUD_BUCKET_USER_PROFILE;
const upload = multer({ storage: multer.memoryStorage() });
const defaultPhotoUrl =
  `https://storage.googleapis.com/${bucketName}/default-profile.jpg`.trim();

const usersPendingVerification = new Map(); // Untuk menyimpan data sementara

async function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD_EMAIL,
    },
  });

  const mailOptions = { from: process.env.EMAIL, to, subject, text };

  return transporter.sendMail(mailOptions);
}

function generateOtp() {
  const otp = crypto.randomInt(10000, 99999).toString();
  const otpExpiration = new Date();

  otpExpiration.setMinutes(otpExpiration.getMinutes() + 10);

  return { otp, otpExpiration };
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Registers a new user with their name, email, and password. If the email is not already in use, an OTP is sent to the email for verification purposes.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name of the user
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to register, must be unique
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password for the account, which will be hashed before storage
 *     responses:
 *       200:
 *         description: OTP sent to the email successfully for verification. The OTP needs to be used to complete registration.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 otp:
 *                   type: string
 *                   description: OTP sent to user's email for verification (not recommended in production)
 *               example:
 *                 success: true
 *                 message: "Kode OTP telah dikirim ke email Anda"
 *                 otp: "12345"
 *       400:
 *         description: Email already in use or other input validation errors.
 *       500:
 *         description: Failed to send the email or other server-side error.
 */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.findOne({ email })) {
    return res.send({ success: false, message: 'Email sudah digunakan' });
  }

  const encryptedPassword = await hashPassword(password);

  const { otp, otpExpiration } = generateOtp();
  usersPendingVerification.set(email, {
    name,
    otp,
    otpExpiration,
    encryptedPassword,
  });

  try {
    await sendEmail(
      email,
      'Verifikasi OTP untuk Pendaftaran',
      `Kode OTP Anda: ${otp}`
    );

    return res.json({
      success: true,
      message: 'Kode OTP telah dikirim ke email Anda',
      otp,
    });
  } catch (error) {
    return res.json({ success: false, message: 'Gagal mengirim email' });
  }
});

/**
 * @swagger
 * /auth/verify-register:
 *   post:
 *     summary: Verify registration OTP
 *     description: Verifies the OTP sent to the user during the registration process. If the OTP is valid and has not expired, completes the user registration.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email address associated with the pending registration.
 *               otp:
 *                 type: string
 *                 description: The OTP sent to the user's email for verification.
 *     responses:
 *       200:
 *         description: Registration completed successfully. User account has been created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *               example:
 *                 success: true
 *                 message: "Pendaftaran berhasil, akun telah dibuat"
 *       400:
 *         description: OTP not valid or has expired.
 *       404:
 *         description: Email not registered or OTP has expired.
 *       500:
 *         description: An error occurred while creating the account.
 */
router.post('/verify-register', async (req, res) => {
  const { email, otp } = req.body;

  const userPending = usersPendingVerification.get(email);

  if (!userPending) {
    return res.status(404).json({
      success: false,
      message: 'Email tidak terdaftar atau OTP sudah kedaluwarsa',
    });
  }

  if (userPending.otp !== otp) {
    return res.status(400).json({ success: false, message: 'OTP tidak valid' });
  }

  if (new Date() > userPending.otpExpiration) {
    usersPendingVerification.delete(email);
    return res
      .status(400)
      .json({ success: false, message: 'OTP sudah kedaluwarsa' });
  }

  const cleanedPhotoUrl = defaultPhotoUrl.replace(/\s+/g, '');

  console.log(`defaultPhoto: ${defaultPhotoUrl}`);

  try {
    const user = new User({
      name: userPending.name,
      email,
      password: userPending.encryptedPassword,
      resetToken: null,
      registrationOtp: userPending.otp,
      otpExpiration: userPending.otpExpiration,
      photoUrl: cleanedPhotoUrl,
    });

    console.log(`userPhoto: ${user.photoUrl}`);

    await user.save();
    usersPendingVerification.delete(email);

    return res.status(200).json({
      success: true,
      message: 'Pendaftaran berhasil, akun telah dibuat',
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Terjadi kesalahan saat membuat akun' });
  }
});

/**
 * @swagger
 * /auth/login-user:
 *   post:
 *     summary: Log in a user
 *     description: Logs in a user by checking the provided email and password, and returns a JWT token if the credentials are valid.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: The user's password
 *     responses:
 *       200:
 *         description: Login successful, JWT token issued.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT token for accessing protected routes
 *                 expireToken:
 *                   type: string
 *                   format: date-time
 *                   description: Expiration time of the token
 *               example:
 *                 success: true
 *                 message: "Login berhasil"
 *                 token: ""
 *                 expireToken: "2024-12-17T15:02:04.000Z"
 *       404:
 *         description: Email not found.
 *       401:
 *         description: Incorrect password.
 */
router.post('/login-user', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(404)
      .send({ success: false, message: 'Email tidak ditemukan' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).send({ success: false, message: 'Password salah' });
  }

  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const decodedToken = jwt.decode(token);
  const expirationTime = decodedToken.exp * 1000;

  res.send({
    success: true,
    message: 'Login berhasil',
    token,
    expireToken: new Date(expirationTime),
  });
});

/**
 * @swagger
 * /auth/userdata:
 *   get:
 *     summary: Retrieve user data
 *     description: Returns the data of the user associated with the provided JWT token.
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 expireToken:
 *                   type: string
 *                   format: date-time
 *                   description: The expiration time of the provided token.
 *       400:
 *         description: No token found in the request headers.
 *       401:
 *         description: Unauthorized access - Token is expired or invalid.
 *       404:
 *         description: User not found in the database.
 *       500:
 *         description: Internal server error.
 */
router.get('/userdata', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res
        .status(400)
        .send({ success: false, message: 'Token tidak ditemukan' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    const { email } = decodedToken;

    const user = await User.findOne({ email });

    console.log(user);

    if (!user) {
      return res
        .status(404)
        .send({ success: false, message: 'User not found' });
    }

    const expirationTime = decodedToken.exp * 1000;
    const expireToken = new Date(expirationTime);

    return res.send({
      success: true,
      data: user,
      expireToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res
        .status(401)
        .send({ success: false, message: 'Token kadaluarsa' });
    }

    return res.status(500).send({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: |
 *       Sends a password reset OTP to the user's email if it is registered. Note: Typically, the OTP should not be included in the response for security reasons.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the user requesting a password reset.
 *     responses:
 *       200:
 *         description: OTP sent successfully. Check your email to proceed with the password reset.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 otp:
 *                   type: string
 *                   description: OTP sent to user's email.
 *       404:
 *         description: Email not registered in the database.
 *       500:
 *         description: Failed to send the email due to a server error.
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(404)
      .json({ success: false, message: 'Email tidak terdaftar' });
  }

  const { otp } = generateOtp();
  user.resetToken = otp;
  await user.save();

  try {
    await sendEmail(email, 'Reset Password', `Verifikasi OTP: ${otp}`);
    return res.json({ success: true, message: 'Kode OTP telah dikirim', otp });
  } catch (error) {
    return res.json({ success: false, message: 'Gagal mengirim email' });
  }
});

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset the user's password
 *     description: Allows users to reset their password by providing a valid OTP and a new password.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *               - newPassword
 *             properties:
 *               otp:
 *                 type: string
 *                 description: The one-time password provided for password reset verification.
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: The new password to be set for the user.
 *     responses:
 *       200:
 *         description: Password reset successfully. User can now log in with the new password.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid OTP provided, password reset not possible.
 *       500:
 *         description: Internal server error during the password reset process.
 */
router.post('/reset-password', async (req, res) => {
  const { otp, newPassword } = req.body;

  const user = await User.findOne({ resetToken: otp });
  if (!user) {
    return res.status(400).json({ success: false, message: 'OTP tidak valid' });
  }

  user.password = await hashPassword(newPassword);
  user.resetToken = null;
  await user.save();

  return res
    .status(200)
    .json({ success: true, message: 'Password berhasil direset' });
});

/**
 * @swagger
 * /auth/update/{userId}:
 *   patch:
 *     summary: Update user profile
 *     description: Updates the user's profile information, including name and profile photo. The photo is optional.
 *     tags: [User Management]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID to update.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The new name of the user.
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: The new profile photo to upload.
 *     responses:
 *       200:
 *         description: User profile updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input, data formats are not correct.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Failed to update the user due to server error or failed upload.
 */
router.patch('/update/:userId', upload.single('photo'), async (req, res) => {
  const { userId } = req.params;
  const { name } = req.body;
  const file = req.file;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    if (name) {
      user.name = name;
    }

    if (file) {
      const blob = storage.bucket(bucketName).file(file.originalname);
      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
      });

      await new Promise((resolve, reject) => {
        blobStream.on('error', (err) => {
          console.error(err);
          reject(new Error('Gagal upload, pilih ulang gambar profile anda'));
        });

        blobStream.on('finish', async () => {
          user.photoUrl =
            `https://storage.googleapis.com/${bucketName}/${blob.name}`.replace(
              /\s+/g,
              ''
            );
          resolve();
        });

        blobStream.end(file.buffer);
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profil user berhasil diperbarui',
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /auth/delete-profile-photo:
 *   delete:
 *     summary: Delete user's profile photo
 *     description: Removes the user's profile photo and resets it to the default photo URL.
 *     tags: [User Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The user ID whose profile photo is to be deleted.
 *     responses:
 *       200:
 *         description: Profile photo successfully deleted and reset to default.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 photoUrl:
 *                   type: string
 *                   description: The new URL of the default photo.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Server error occurred while deleting the profile photo.
 */
router.delete('/delete-profile-photo', async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User tidak ditemukan' });
    }

    user.photoUrl = defaultPhotoUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Foto profil berhasil dihapus',
      photoUrl: defaultPhotoUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export { router as UserRouter };
