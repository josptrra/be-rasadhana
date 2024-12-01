import { Storage } from '@google-cloud/storage';
import tf from '@tensorflow/tfjs';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Instance Google Cloud Storage
const storage = new Storage();
const bucketName = process.env.GCLOUD_BUCKET_NAME_MODEL;

// Fungsi untuk memuat model dari Cloud Storage
export const loadModelFromGCS = async () => {
  const modelUrl = `gs://${bucketName}/model_food_classification2.h5`;

  try {
    const model = await tf.loadLayersModel(
      `gs://${bucketName}/model_food_classification2.h5`
    );
    console.log('Model berhasil dimuat dari Cloud Storage');
    return model;
  } catch (error) {
    console.error('Gagal memuat model:', error.message);
    throw new Error('Gagal memuat model dari Cloud Storage');
  }
};

// Fungsi untuk preprocessing gambar
const preprocessImage = async (imageBuffer) => {
  const tensor = tf.node
    .decodeImage(imageBuffer, 3) // Decode image menjadi tensor
    .resizeBilinear([224, 224]) // Resize ke ukuran input model
    .toFloat()
    .div(255.0) // Normalisasi nilai piksel ke [0, 1]
    .expandDims(); // Tambahkan dimensi batch
  return tensor;
};

// Fungsi untuk memprediksi bahan makanan
export const predictIngredient = async (photoUrl) => {
  try {
    // Ambil gambar dari URL
    const response = await axios.get(photoUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data, 'binary');

    // Preprocessing gambar
    const preprocessedImage = await preprocessImage(imageBuffer);

    // Muat model (gunakan caching jika perlu)
    const model = await loadModelFromGCS();

    // Lakukan prediksi
    const prediction = model.predict(preprocessedImage);
    const predictedIndex = prediction.argMax(-1).dataSync()[0]; // Ambil indeks prediksi

    // Map hasil prediksi ke nama bahan makanan
    const ingredients = ['kentang', 'tomat', 'tempe', 'wortel']; // Contoh label
    const detectedIngredient = ingredients[predictedIndex];

    return detectedIngredient;
  } catch (error) {
    console.error('Gagal melakukan prediksi:', error.message);
    throw new Error('Gagal memproses gambar untuk prediksi');
  }
};

// Fungsi untuk mendapatkan resep berdasarkan bahan
export const getRecipes = async (ingredient) => {
  const recipesDatabase = {
    kentang: ['Kentang Goreng', 'Perkedel Kentang'],
    tomat: ['Sup Tomat', 'Salad Tomat'],
    tempe: ['Tempe Goreng', 'Oseng Tempe'],
    wortel: ['Wortel Rebus', 'Sup Wortel'],
  };

  // Ambil resep berdasarkan bahan
  return recipesDatabase[ingredient] || [];
};
