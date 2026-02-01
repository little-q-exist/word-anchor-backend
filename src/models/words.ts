import mongoose from 'mongoose';

interface Definition {
  meaning: string;
  partOfSpeech: string;
}

const definitionSchema = new mongoose.Schema<Definition>({
  meaning: { type: String, required: [true, 'Must have a meaning'] },
  partOfSpeech: {
    type: String,
    required: true,
    enum: ['verb', 'noun', 'adjective', 'adverb', 'preposition'],
  },
});

export interface Word {
  definitions: Definition[];
  english: string;
  exampleSentence: string[];
  phonetic: string;
  related: string[];
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
}

type THydratedWordDocument = {
  definitions?: mongoose.Types.DocumentArray<Definition>;
  english: string;
  exampleSentence: string[];
  phonetic: string;
  related: string[];
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type WordModelType = mongoose.Model<Word, {}, {}, {}, THydratedWordDocument>;

const wordSchema = new mongoose.Schema<Word, WordModelType>({
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
  exampleSentence: { type: [String], required: true },
  phonetic: { type: String, required: true },
  related: [String],
  tags: {
    type: [
      {
        type: String,
        enum: ['CET4', 'CET6', 'TOEFL', 'IELTS', 'GRE', '考研', '编程', '日常'],
      },
    ],
    default: [],
  },
  createdBy: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'User',
  },
});

export default mongoose.model('Word', wordSchema);
