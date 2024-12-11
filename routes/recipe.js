import express from 'express';
import multer from 'multer';
import { Recipe } from '../models/recipeModel.js';
import { Storage } from '@google-cloud/storage';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);

// kalo mau jalanin di localmenjalankan di local
// const __dirname = path.dirname(__filename);

// process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(
//   __dirname,
//   '../config/service-account-key.json'
// );

const storage = new Storage();
const recipeBucketName = process.env.GCLOUD_BUCKET_NAME_RECIPES;
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /recipes/create-recipe:
 *   post:
 *     summary: Create a new recipe (for homepage purposes)
 *     description: Uploads a recipe image to Google Cloud Storage and saves the recipe details (title, ingredients, steps, and image URL) to the database.
 *     tags: [Recipes]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the recipe.
 *               ingredients:
 *                 type: string
 *                 description: The ingredients used in the recipe, formatted as a string.
 *               steps:
 *                 type: string
 *                 description: The preparation steps for the recipe.
 *               recipeImage:
 *                 type: string
 *                 format: binary
 *                 description: The image file of the recipe to upload.
 *     responses:
 *       201:
 *         description: Recipe created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 recipeImageUrl:
 *                   type: string
 *                   description: The URL of the uploaded recipe image.
 *       400:
 *         description: No image file was uploaded.
 *       500:
 *         description: Failed to upload the image to Google Cloud Storage or save the recipe details.
 */
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

/**
 * @swagger
 * /recipes/allrecipe:
 *   get:
 *     summary: Retrieve all recipes (mapping for homepage only)
 *     description: Fetches all the recipes stored in the database.
 *     tags: [Recipes]
 *     responses:
 *       200:
 *         description: Successfully retrieved all recipes.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 recipes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Recipe'
 *       404:
 *         description: No recipes found in the database.
 *       500:
 *         description: Internal server error occurred while fetching recipes.
 */
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

/**
 * @swagger
 * /recipes/update/{id}:
 *   patch:
 *     summary: Update a recipe
 *     description: Updates the details of an existing recipe, including its title, ingredients, steps, and optionally its image.
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the recipe to update.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The updated title of the recipe.
 *               ingredients:
 *                 type: string
 *                 description: The updated list of ingredients for the recipe.
 *               steps:
 *                 type: string
 *                 description: The updated preparation steps for the recipe.
 *               recipeImage:
 *                 type: string
 *                 format: binary
 *                 description: The new image file for the recipe (optional).
 *     responses:
 *       200:
 *         description: Successfully updated the recipe.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 recipe:
 *                   $ref: '#/components/schemas/Recipe'
 *       404:
 *         description: Recipe not found.
 *       500:
 *         description: Internal server error occurred while updating the recipe.
 */
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

/**
 * @swagger
 * /recipes/delete/{id}:
 *   delete:
 *     summary: Delete a recipe
 *     description: Deletes a recipe by its ID, including removing the associated image from Google Cloud Storage if applicable.
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the recipe to delete.
 *     responses:
 *       200:
 *         description: Recipe successfully deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Recipe not found.
 *       500:
 *         description: Internal server error occurred while deleting the recipe.
 */
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

    const fileName = recipe.recipeImage.split('/').pop();
    const file = storage.bucket(recipeBucketName).file(`recipes/${fileName}`);

    await file.delete();

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
