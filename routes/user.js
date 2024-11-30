import express from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
// import SwaggerUI from 'swagger-ui';

const router = express.Router();

// SwaggerUI({
//   dom_id: '#myDomId',
// });

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  const oldEmailUser = await User.findOne({ email });

  if (oldEmailUser) {
    return res.send({ success: false, message: 'Email sudah digunakan' });
  }

  const encryptedPassword = await bcrypt.hash(password, 10);

  try {
    await User.create({
      name: name,
      email: email,
      password: encryptedPassword,
    });
    res.send({ success: true, message: 'User telah didaftarkan' });
  } catch (error) {
    res.send({ success: false, message: error.message });
  }
});

router.post('/login-user', async (req, res) => {
  const { email, password } = req.body;
  const oldUser = await User.findOne({ email });

  if (!oldUser) {
    return res.send({ success: false, message: 'Email Tidak terdaftar' });
  }

  const validPassword = await bcrypt.compare(password, oldUser.password);

  if (validPassword) {
    const token = jwt.sign({ email: oldUser.email }, process.env.JWT_SECRET);
    return res.send({ success: true, message: 'Login berhasil', data: token });
  } else {
    return res.send({ success: false, message: 'Password anda salah' });
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

export { router as UserRouter };
