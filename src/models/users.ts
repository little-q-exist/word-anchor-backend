import mongoose from 'mongoose';

interface UserLearningData {
  familiarity: number;
  favorited: boolean;
  mastered: boolean;
  wordId?: mongoose.Types.ObjectId | null;
}

const userLearningSchema = new mongoose.Schema<UserLearningData>({
  wordId: { type: mongoose.Types.ObjectId, ref: 'Word' },
  familiarity: { type: Number, required: true, default: 0, enum: [0, 1, 2, 3] },
  favorited: { type: Boolean, required: true, default: false },
  mastered: { type: Boolean, required: true, default: false },
  // TODO: 用户复习进度
});

interface User {
  username: string;
  passwordHash: string;
  userLearningData: UserLearningData[];
}

type THydratedUserDocument = {
  username: string;
  passwordHash: string;
  userLearningData?: mongoose.Types.DocumentArray<UserLearningData>;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type UserModelType = mongoose.Model<User, {}, {}, {}, THydratedUserDocument>;

const userSchema = new mongoose.Schema<User, UserModelType>({
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
  userLearningData: [userLearningSchema],
});

export default mongoose.model('User', userSchema);
