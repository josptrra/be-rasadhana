import express from 'express';
import dotenv from 'dotenv';
import { UserRouter } from './routes/user.js';
import { PhotoRouter } from './routes/photo.js';
import { RecipeRouter } from './routes/recipe.js';

import mongoose from 'mongoose';

dotenv.config();
const app = express();

const PORT = process.env.PORT || 8080;
const mongoUrl = process.env.MONGO_URL;

if (!process.env.MONGO_URL) {
  throw new Error('MONGO_URL is not set in .env');
}
if (!process.env.GCLOUD_BUCKET_NAME) {
  throw new Error('GCLOUD_BUCKET_NAME is not set in .env');
}

// unkomen jika mau menjalankan di local
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error(
    'GOOGLE_APPLICATION_CREDENTIALS is not set or file is missing'
  );
}

process.env.GOOGLE_APPLICATION_CREDENTIALS =
  './config/service-account-key.json';

// Middleware untuk parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log('Database Connected');
  })
  .catch((e) => {
    console.log(e);
  });

app.use('/auth', UserRouter);
app.use('/photos', PhotoRouter);
app.use('/recipes', RecipeRouter);

app.get('/', (req, res) => {
  res.send('Welcome to the API Rasadhana versi 1.0');
});

app.listen(PORT, () => {
  console.log(`server running in http://localhost:${PORT}`);
});
