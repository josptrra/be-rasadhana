import express from 'express';
import multer from 'multer';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { UserPhoto } from '../models/userPhotoModel.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

//jika mau menjalankan di local
// const __dirname = path.dirname(__filename);

// process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(
//   __dirname,
//   '../config/service-account-key.json'
// );

const router = express.Router();

const storage = new Storage();
const bucketName = process.env.GCLOUD_BUCKET_NAME;
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-photo', upload.single('photo'), async (req, res) => {
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

      const newPhoto = new UserPhoto({
        userId,
        photoUrl,
      });
      await newPhoto.save();

      res.status(201).json({
        success: true,
        message: 'Foto berhasil diunggah',
        photoUrl,
      });
    });

    blobStream.end(file.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const photos = await UserPhoto.find({ userId });
    if (!photos.length) {
      return res
        .status(404)
        .json({ success: false, message: 'Foto tidak ditemukan' });
    }

    res.status(200).json({ success: true, data: photos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export { router as PhotoRouter };