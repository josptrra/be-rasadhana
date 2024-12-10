import express from 'express';
import multer from 'multer';
import { Recipe } from '/models/recipeModel';
import { Storage } from '@google-cloud/storage';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);

// kalo mau jalanin di localmenjalankan di local
const __dirname = path.dirname(__filename);

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(
  __dirname,
  '../config/service-account-key.json'
);

const storage = new Storage();
const recipeBucketName = process.env.GCLOUD_BUCKET_NAME_RECIPES;
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/create-recipe',
  upload.single('recipeImage'),
  async (req, res) => {
    const { title, ingredients, steps } = req.body;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: 'Tidak ada file yang diunggah' });
    }

    try {
      const blob = storage
        .bucket(recipeBucketName)
        .file(`recipes/${Date.now()}-${file.originalname}`);
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
        const recipeImageUrl = `https://storage.googleapis.com/${recipeBucketName}/${blob.name}`;

        // Simpan resep baru dengan foto di URL
        const newRecipe = new Recipe({
          title,
          ingredients,
          steps,
          recipeImage: recipeImageUrl,
        });
        await newRecipe.save();

        res.status(201).json({
          success: true,
          message: 'Resep berhasil diunggah',
          recipeImageUrl,
        });
      });

      blobStream.end(file.buffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.get('/allrecipe', async (req, res) => {
  try {
    const recipes = await Recipe.find();
    if (!recipes || recipes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada resep ditemukan',
      });
    }
    res.status(200).json({
      success: true,
      recipes: recipes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data resep',
    });
  }
});

router.patch('/update/:id', upload.single('recipeImage'), async (req, res) => {
  const { id } = req.params;
  const { title, ingredients, steps } = req.body;
  const file = req.file;

  try {
    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Resep tidak ditemukan',
      });
    }

    if (title) recipe.title = title;
    if (ingredients) recipe.ingredients = ingredients;
    if (steps) recipe.steps = steps;

    // Jika ada file foto baru, upload foto dan simpan URL-nya
    if (file) {
      const blob = storage
        .bucket(recipeBucketName)
        .file(`recipes/${Date.now()}-${file.originalname}`);
      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
      });

      blobStream.on('error', (err) => {
        console.error(err);
        return res.status(500).json({
          success: false,
          message: 'Gagal upload ke Google Cloud Storage',
        });
      });

      blobStream.on('finish', async () => {
        const recipeImageUrl = `https://storage.googleapis.com/${recipeBucketName}/${blob.name}`;
        recipe.recipeImage = recipeImageUrl;
        await recipe.save();

        res.status(200).json({
          success: true,
          message: 'Resep berhasil diperbarui',
          recipe,
        });
      });

      blobStream.end(file.buffer);
    } else {
      // Jika tidak ada gambar yang di-upload, hanya update data lain
      await recipe.save();
      res.status(200).json({
        success: true,
        message: 'Resep berhasil diperbarui',
        recipe,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui resep',
    });
  }
});

router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Resep tidak ditemukan',
      });
    }

    // Menghapus gambar dari Google Cloud Storage (opsional)
    const fileName = recipe.recipeImage.split('/').pop(); // Ambil nama file dari URL
    const file = storage.bucket(recipeBucketName).file(`recipes/${fileName}`);

    await file.delete(); // Menghapus file gambar dari GCS

    // Hapus resep dari database
    await recipe.remove();

    res.status(200).json({
      success: true,
      message: 'Resep berhasil dihapus',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus resep',
    });
  }
});

export { router as RecipeRouter };
