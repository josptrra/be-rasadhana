import mongoose from 'mongoose';

// Membuat schema untuk foto pengguna
const userPhotoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserInfo', // Hubungkan dengan koleksi UserInfo jika ada
      required: true,
    },
    photoUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }, // Menyimpan waktu upload
  },
  {
    collection: 'UserPhotos', // Nama koleksi di MongoDB
  }
);

// Membuat model UserPhoto
const userPhotoModel = mongoose.model('UserPhoto', userPhotoSchema);

export { userPhotoModel as UserPhoto };
