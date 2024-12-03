import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    ingredients: { type: String, required: true },
    steps: { type: String, required: true },
    recipeImage: { type: String, required: true },
  },
  {
    collection: 'Recipes',
  }
);

const recipeModel = mongoose.model('Recipes', recipeSchema);

export { recipeModel as Recipe };
