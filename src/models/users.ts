import mongoose from 'mongoose';

export interface UserLearningData {
  familiarity: 0 | 1 | 2 | 3;
  mastered: boolean;

  favorited: boolean;

  wordId: mongoose.Types.ObjectId;
}

const userLearningSchema = new mongoose.Schema<UserLearningData>({
  wordId: { type: mongoose.Types.ObjectId, required: true, ref: 'Word' },
  familiarity: { type: Number, required: true, default: 0, enum: [0, 1, 2, 3] },
  favorited: { type: Boolean, required: true, default: false },
  mastered: { type: Boolean, required: true, default: false },
  // TODO: 用户复习进度
});

export interface NewUser {
  username: string;
  email?: string;
  password: string;
}

export interface User {
  username: string;
  email?: string;
  passwordHash: string;
  userLearningData: UserLearningData[];
  isAdmin: boolean;
}

type THydratedUserDocument = {
  username: string;
  email?: string;
  passwordHash: string;
  userLearningData?: mongoose.Types.DocumentArray<UserLearningData>;
  isAdmin: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type UserModelType = mongoose.Model<User, {}, {}, {}, THydratedUserDocument>;

const userSchema = new mongoose.Schema<User, UserModelType>({
  username: { type: String, required: true, index: 1 },
  email: String,
  passwordHash: { type: String, required: true },
  userLearningData: [userLearningSchema],
  isAdmin: { type: Boolean, required: true, default: false },
});

export default mongoose.model('User', userSchema);
