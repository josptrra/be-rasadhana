import express from 'express';
import { predictIngredient, getRecipes } from './helper.js';
import { Prediction } from '../models/predictionModel.js';

const router = express.Router();

router.post('/predict-recipe', async (req, res) => {
  const { userId, photoUrl } = req.body;

  if (!photoUrl || !userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID atau Photo URL tidak diberikan',
    });
  }

  try {
    // Prediksi bahan makanan
    const detectedIngredient = await predictIngredient(photoUrl);

    // Dapatkan resep berdasarkan bahan makanan
    const recipes = await getRecipes(detectedIngredient);

    // Simpan hasil prediksi ke database
    const newPrediction = new Prediction({
      userId,
      photoUrl,
      detectedIngredient,
      recipes,
    });
    await newPrediction.save();

    res.status(200).json({
      success: true,
      detectedIngredient,
      recipes,
      message: 'Hasil prediksi berhasil disimpan',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Gagal memproses prediksi dan menyimpan hasil',
    });
  }
});

router.get('/user-predictions/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const predictions = await Prediction.find({ userId }).sort({
      createdAt: -1,
    });
    if (!predictions.length) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada prediksi untuk user ini',
      });
    }

    res.status(200).json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data prediksi',
    });
  }
});

export { router as RecipeRouter };
