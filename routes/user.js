import express from 'express';
import bcryt from 'bcrypt';
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
  const oldNamelUser = await User.findOne({ name });

  if (oldNamelUser) {
    return res.send({success: false, message: 'Nama sudah digunakan' });
  } else if (oldEmailUser) {
    return res.send({success: false, message: 'Email sudah digunakan' });
  }

  const encryptedPassword = await bcryt.hash(password, 10);

  try {
    await User.create({
      name: name,
      email: email,
      password: encryptedPassword,
    });
    res.send({success: true, message: 'User telah didaftarkan' });
  } catch (error) {
    res.send({success: false, message: error });
  }
});

router.post('/login-user', async (req, res) => {
  const { email, password } = req.body;
  const oldUser = await User.findOne({ email });

  if (!oldUser) {
    return res.send({success: false, message: 'Email Tidak terdaftar' });
  }

  const validPassword = await bcryt.compare(password, oldUser.password);

  if (validPassword) {
    const token = jwt.sign({ email: oldUser.email }, process.env.JWT_SECRET);
    return res.send({success: true, message: "Login berhasil", data: token });
  } else {
    return res.send({success: false, message: 'Password anda salah' });
  }
});

router.post('/userdata', async (req, res) => {
  const { token } = req.body;
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const useremail = user.email;

    const userData = await User.findOne({ email: useremail });

    if (!userData) {
      return res.status(404).send({success: false, message: 'User not found' });
    }
    return res.send({ success: true, data: userData });
  } catch (error) {
    return res.status(500).send({success: false, message: error.message });
  }
});

router.patch('/update/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({success: false, message: 'Pengguna tidak ditemukan' });
    }

    if (req.body.email) {
      user.email = req.body.email;
    }
    if (req.body.name) {
      user.name = req.body.name;
    }

    await user.save();

    res.status(201).json({success: true, user, message: 'Berhasil update' });
  } catch (err) {
    res.status(400).json({success: false, message: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({success: false, message: 'Email tidak terdaftar' });
    }
    const token = crypto.randomInt(10000, 99999).toString();

    user.resetToken = token;
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
      text: `Verifikasi token: ${token}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return res.json({ success: false, message: 'error mengirim email' });
      } else {
        return res.json({ success: true, message: 'email sent', token });
      }
    });
  } catch (err) {
    console.log(err);
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({ resetToken: token });

    if (!user) {
      return res.status(400).json({success: false, message: 'invalid reset token' });
    }

    const encryptedPassword = await bcryt.hash(newPassword, 10);

    user.password = encryptedPassword;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: 'Password berhasil direset' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({success: false, message: 'Gagal mereset password' });
  }
});

export { router as UserRouter };
