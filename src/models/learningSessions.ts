import mongoose from 'mongoose';

export type LearningMode = 'learn' | 'review';

export interface SessionWordState {
  _id: string;
  english: string;
  status: 'idle' | 'passed' | 'failed';
}

export interface SessionQueueSnapshot {
  index: number;
  isRepeating: boolean;
  repeatQueue: number[];
  updatedAt: number;
}

export interface LearningSessionState {
  userId: mongoose.Types.ObjectId;
  mode: LearningMode;
  words: SessionWordState[];
  queueSnapshot: SessionQueueSnapshot;
  version: number;
  updatedByDevice?: string;
}

const sessionWordSchema = new mongoose.Schema<SessionWordState>(
  {
    _id: { type: String, required: true },
    english: { type: String, required: true },
    status: { type: String, required: true, enum: ['idle', 'passed', 'failed'] },
  },
  { _id: false }
);

const sessionQueueSnapshotSchema = new mongoose.Schema<SessionQueueSnapshot>(
  {
    index: { type: Number, required: true },
    isRepeating: { type: Boolean, required: true },
    repeatQueue: { type: [Number], required: true, default: [] },
    updatedAt: { type: Number, required: true },
  },
  { _id: false }
);

const learningSessionSchema = new mongoose.Schema<LearningSessionState>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    mode: { type: String, required: true, enum: ['learn', 'review'] },
    words: { type: [sessionWordSchema], required: true, default: [] },
    queueSnapshot: { type: sessionQueueSnapshotSchema, required: true },
    version: { type: Number, required: true, default: 1 },
    updatedByDevice: { type: String },
  },
  {
    timestamps: true,
  }
);

learningSessionSchema.index({ userId: 1, mode: 1 }, { unique: true });

export default mongoose.model<LearningSessionState>('LearningSession', learningSessionSchema);
