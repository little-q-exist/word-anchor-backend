import mongoose from 'mongoose';

const definitionSchema = new mongoose.Schema({
  meaning: { type: String, required: [true, 'Must have a meaning'] },
  partOfSpeech: {
    type: String,
    required: true,
    enum: ['verb', 'noun', 'adjective', 'adverb', 'preposition'],
  },
});

const userLearningSchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  familiarity: { type: Number, required: true, default: 0, enum: [0, 1, 2, 3] },
  favorited: { type: Boolean, required: true, default: false },
  mastered: { type: Boolean, required: true, default: false },
});

const wordSchema = new mongoose.Schema({
  definitions: {
    type: [definitionSchema],
    required: true,
    validate: {
      validator: function (v: Array<unknown>) {
        return v.length > 0;
      },
      message: 'Must have at least 1 definition',
    },
  },
  english: { type: String, required: true, lowercase: true, index: true, trim: true },
  exampleSentence: { type: String, required: true },
  phonetic: { type: String, required: true },
  related: String,
  tags: {
    type: [
      {
        type: String,
        enum: ['CET4', 'CET6', 'TOEFL', 'IELTS', 'GRE', '考研', '编程', '日常'],
      },
    ],
    default: [],
  },
  userLearningData: [userLearningSchema],
  createdAt: { type: Date },
});

export default mongoose.model('Word', wordSchema);
