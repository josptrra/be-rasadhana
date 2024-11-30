import express from 'express';
import dotenv from 'dotenv';
import { UserRouter } from './routes/user.js';

import mongoose from 'mongoose';

dotenv.config();
const app = express();

const PORT = process.env.PORT || 8080;
const mongoUrl = process.env.MONGO_URL;
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

app.get('/', (req, res) => {
  res.send('Welcome to the API Rasadhana versi 1.0.0');
});

app.listen(PORT, () => {
  console.log(`server running in http://localhost:${PORT}`);
});
