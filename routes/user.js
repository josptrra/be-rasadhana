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
const defaultPhotoUrl = `https://storage.googleapis.com/${bucketName}/default-profile.jpg`.trim();

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

  console.log(`defaultPhoto: ${defaultPhotoUrl}`)
  
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

    console.log(`userPhoto: ${user.photoUrl}`)

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

    console.log(user)

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
          user.photoUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}`.replace(/\s+/g, '');
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
