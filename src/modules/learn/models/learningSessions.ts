import mongoose from 'mongoose';
import { TimeService } from '../services/time.js';

export type LearningMode = 'learn' | 'review';

export interface SessionWord {
  _id: string;
  english: string;
  status: 'idle' | 'passed' | 'failed';
}

export interface SessionQueueSnapshot {
  index: number;
  isRepeating: boolean;
  repeatQueue: number[];
  version: string;
}

export interface LearningSession {
  userId: mongoose.Types.ObjectId;
  mode: LearningMode;
  words: SessionWord[];
  queueSnapshot: SessionQueueSnapshot;
  version: string;
}

const sessionWordSchema = new mongoose.Schema<SessionWord>(
  {
    _id: { type: String, required: true },
    english: { type: String, required: true },
    status: { type: String, required: true, enum: ['idle', 'passed', 'failed'] },
  },
  { _id: false }
);

const sessionQueueSnapshotSchema = new mongoose.Schema<SessionQueueSnapshot>(
  {
    index: { type: Number, required: true, default: 0 },
    isRepeating: { type: Boolean, required: true, default: false },
    repeatQueue: { type: [Number], required: true, default: [] },
    version: { type: String, default: () => TimeService.getCurrentTimeStamp() },
  },
  { _id: false }
);

const learningSessionSchema = new mongoose.Schema<LearningSession>({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  mode: { type: String, required: true, enum: ['learn', 'review'] },
  words: { type: [sessionWordSchema], required: true },
  queueSnapshot: { type: sessionQueueSnapshotSchema, default: () => ({}) },
  version: { type: String, default: () => TimeService.getCurrentTimeStamp() },
});

learningSessionSchema.index({ userId: 1, mode: 1 }, { unique: true });

export default mongoose.model<LearningSession>('LearningSession', learningSessionSchema);
