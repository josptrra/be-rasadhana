import mongoose from 'mongoose';

const userDetailSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String },
    photo: { type: mongoose.Schema.Types.ObjectId, ref: 'fs.files' },
    resetToken: String,
    registrationOtp: String,
    otpExpiration: Date,
  },
  {
    collection: 'UserInfo',
  }
);

const userModel = mongoose.model('UserInfo', userDetailSchema);

export { userModel as User };
