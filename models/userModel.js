import mongoose from 'mongoose';

const userDetailSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String,
    resetToken: String,
  },
  {
    collection: 'UserInfo',
  }
);

const userModel = mongoose.model('UserInfo', userDetailSchema);

export { userModel as User };
