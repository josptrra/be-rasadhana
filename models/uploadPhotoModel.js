import mongoose from 'mongoose';

const userPhotoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserInfo',
      required: true,
    },
    photoUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'UserPhotos',
  }
);

const userPhotoModel = mongoose.model('UserPhoto', userPhotoSchema);

export { userPhotoModel as UserPhoto };