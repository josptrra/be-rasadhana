import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userInfo',
    required: true,
  },
  photoUrl: {
    type: String,
    required: true,
  },
  detectedIngredient: {
    type: String,
    required: true,
  },
  recipes: {
    type: [String], // Array untuk menyimpan daftar resep
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Prediction = mongoose.model('Prediction', predictionSchema);
