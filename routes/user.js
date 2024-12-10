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
const defaultPhotoUrl = `https://storage.googleapis.com/${bucketName}/default-profile.jpg`;

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

  try {
    const user = new User({
      name: userPending.name,
      email,
      password: userPending.encryptedPassword,
      resetToken: null,
      registrationOtp: userPending.otp,
      otpExpiration: userPending.otpExpiration,
      photoUrl: defaultPhotoUrl,
    });

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

  if (!email || !password) {
    return res.send({
      success: false,
      message: 'Email dan password harus diisi',
    });
  }

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.send({ success: false, message: 'Email atau password salah' });
  }

  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET);
  return res.send({ success: true, message: 'Login berhasil', data: token });
});

router.get('/userdata', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    const { email } = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .send({ success: false, message: 'User not found' });
    }

    return res.send({ success: true, data: user });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

router.patch('/update/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        message: 'Field name diperlukan untuk memperbarui nama',
      });
    }

    user.name = req.body.name;
    await user.save();

    return res
      .status(200)
      .json({ success: true, user, message: 'Nama berhasil diupdate' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
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

router.patch(
  '/update-profile-photo',
  upload.single('photo'),
  async (req, res) => {
    const { userId } = req.body;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: 'Tidak ada file yang diunggah' });
    }

    try {
      const blob = storage.bucket(bucketName).file(file.originalname);
      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
      });

      blobStream.on('error', (err) => {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: 'Gagal upload ke GCS' });
      });

      blobStream.on('finish', async () => {
        const photoUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}`;

        const user = await User.findByIdAndUpdate(
          userId,
          { photoUrl },
          { new: true }
        );

        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: 'User tidak ditemukan' });
        }

        res.status(200).json({
          success: true,
          message: 'Foto profil berhasil diubah',
          photoUrl,
        });
      });

      blobStream.end(file.buffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

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
