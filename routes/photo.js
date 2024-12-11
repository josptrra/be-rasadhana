import express from 'express';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import { UserPhoto } from '../models/uploadPhotoModel.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

// Jika menjalankan di local
// const __dirname = path.dirname(__filename);

// process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(
//   __dirname,
//   '../config/service-account-key.json'
// );

const router = express.Router();

const storage = new Storage();
const bucketName = process.env.GCLOUD_BUCKET_NAME;
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /photos/upload-photo:
 *   post:
 *     summary: User upload an ingredient's photos.
 *     description: Uploads a photo file to Google Cloud Storage and associates the photo URL with the user's ID in the database.
 *     tags: [Endpoints Associated with ML Models]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The unique identifier of the user to associate the photo with.
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: The photo file to upload.
 *     responses:
 *       201:
 *         description: The photo was uploaded successfully and the URL was saved.
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
 *                   description: The URL of the uploaded photo.
 *       400:
 *         description: No file was uploaded.
 *       500:
 *         description: Failed to upload the photo to Google Cloud Storage or save the photo URL to the database.
 */
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

/**
 * @swagger
 * /photos/{userId}:
 *   get:
 *     summary: Retrieve user's ingredients photos
 *     description: Fetches all the photos associated with a given user ID from the database.
 *     tags: [Endpoints Associated with ML Models]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID whose photos are to be retrieved.
 *     responses:
 *       200:
 *         description: Successfully retrieved the photos for the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IngredientsPhoto'
 *                   description: A list of photos associated with the user.
 *       404:
 *         description: No photos found for the user.
 *       500:
 *         description: Internal server error occurred while trying to retrieve photos.
 */
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

/**
 * @swagger
 * /photos/latest/{userId}:
 *   get:
 *     summary: Retrieve the latest photo of ingredients user uploaded
 *     description: Fetches the most recently uploaded photo by the specified user, sorted by the upload date.
 *     tags: [Endpoints Associated with ML Models]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID to fetch the latest photo for.
 *     responses:
 *       200:
 *         description: Successfully retrieved the latest photo for the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/IngredientsPhoto'
 *                   description: The most recent photo of the user.
 *       404:
 *         description: No photos found for the user.
 *       500:
 *         description: Internal server error occurred while trying to fetch the latest photo.
 */
router.get('/latest/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Ambil foto terbaru berdasarkan userId dan diurutkan berdasarkan uploadedAt
    const latestPhoto = await UserPhoto.findOne({ userId: userId })
      .sort({ uploadedAt: -1 }) // Sortir berdasarkan uploadedAt
      .exec();

    if (!latestPhoto) {
      return res
        .status(404)
        .json({ success: false, message: 'Foto tidak ditemukan' });
    }

    res.status(200).json({ success: true, data: latestPhoto });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export { router as PhotoRouter };
