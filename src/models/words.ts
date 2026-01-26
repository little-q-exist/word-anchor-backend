import mongoose from 'mongoose';

const wordSchema = new mongoose.Schema({
  definitions: [{ meaning: String, partOfSpeech: String }],
  english: String,
  exampleSentence: String,
  familiarity: Number,
  favorited: Boolean,
  mastered: Boolean,
  phonetic: String,
  related: String,
});

export default mongoose.model('Word', wordSchema);
