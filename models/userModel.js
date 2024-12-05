import mongoose from 'mongoose';

const userDetailSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    photo: { type: mongoose.Schema.Types.ObjectId, ref: 'fs.files' },
    resetToken: String,
  },
  {
    collection: 'UserInfo',
  }
);

const userModel = mongoose.model('UserInfo', userDetailSchema);

export { userModel as User };
