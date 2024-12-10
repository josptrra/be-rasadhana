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

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  const oldEmailUser = await User.findOne({ email });

  if (oldEmailUser) {
    return res.send({ success: false, message: 'Email sudah digunakan' });
  }

  const otp = crypto.randomInt(10000, 99999).toString();
  const otpExpiration = new Date();
  otpExpiration.setMinutes(otpExpiration.getMinutes() + 10);
  try {
    const user = new User({
      name: name,
      email: email,
      password: null,
      resetToken: null,
      registrationOtp: otp,
      otpExpiration: otpExpiration,
      photoUrl: defaultPhotoUrl,
    });

    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD_EMAIL,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: 'Verifikasi OTP untuk Pendaftaran',
      text: `Kode OTP Anda untuk mendaftar adalah: ${otp}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return res.json({ success: false, message: 'Gagal mengirim email' });
      } else {
        return res.json({
          success: true,
          message: 'Kode OTP telah dikirim ke email Anda',
          otp,
        });
      }
    });
  } catch (error) {
    res.send({ success: false, message: error.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res
      .status(404)
      .json({ success: false, message: 'Email tidak terdaftar' });
  }

  if (user.registrationOtp !== otp) {
    return res.status(400).json({ success: false, message: 'OTP tidak valid' });
  }

  if (new Date() > new Date(user.otpExpiration)) {
    return res
      .status(400)
      .json({ success: false, message: 'OTP sudah kedaluwarsa' });
  }

  const encryptedPassword = await bcrypt.hash(password, 10);

  user.password = encryptedPassword;
  user.registrationOtp = null;
  user.otpExpiration = null;
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Pendaftaran berhasil, akun telah dibuat',
  });
});

router.post('/login-user', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.send({
      success: false,
      message: 'Email dan password harus diisi',
    });
  }

  const oldUser = await User.findOne({ email });

  if (!oldUser) {
    return res.send({ success: false, message: 'Email Tidak terdaftar' });
  }

  if (!oldUser.password) {
    return res.send({
      success: false,
      message: 'Password tidak ditemukan di database',
    });
  }

  try {
    const validPassword = await bcrypt.compare(password, oldUser.password);

    if (validPassword) {
      const token = jwt.sign({ email: oldUser.email }, process.env.JWT_SECRET);
      return res.send({
        success: true,
        message: 'Login berhasil',
        data: token,
      });
    } else {
      return res.send({ success: false, message: 'Password anda salah' });
    }
  } catch (error) {
    console.error(error);
    return res.send({
      success: false,
      message: 'Terjadi kesalahan saat memverifikasi password',
    });
  }
});

router.get('/userdata', async (req, res) => {
  try {
    const bearerToken = req.headers.authorization;
    const token = bearerToken?.split('Bearer ')[1];

    const user = jwt.verify(token, process.env.JWT_SECRET);
    const useremail = user.email;

    const userData = await User.findOne({ email: useremail });

    if (!userData) {
      return res
        .status(404)
        .send({ success: false, message: 'User not found' });
    }
    return res.send({ success: true, data: userData });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

router.patch('/update/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    if (req.body.name) {
      user.name = req.body.name;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Field name diperlukan untuk memperbarui nama',
      });
    }

    await user.save();

    res
      .status(201)
      .json({ success: true, user, message: 'Nama berhasil diupdate' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'Email tidak terdaftar' });
    }
    const otp = crypto.randomInt(10000, 99999).toString();

    user.resetToken = otp;
    await user.save();

    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD_EMAIL,
      },
    });

    var mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: 'Reset Password',
      text: `Verifikasi OTP: ${otp}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return res.json({ success: false, message: 'error mengirim email' });
      } else {
        return res.json({ success: true, message: 'email sent', otp });
      }
    });
  } catch (err) {
    console.log(err);
  }
});

router.post('/reset-password', async (req, res) => {
  const { otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ resetToken: otp });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const encryptedPassword = await bcrypt.hash(newPassword, 10);

    user.password = encryptedPassword;
    user.resetToken = null;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: 'Password berhasil direset' });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: 'Gagal mereset password' });
  }
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
