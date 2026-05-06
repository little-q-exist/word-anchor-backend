import mongoose from 'mongoose';
import type { User } from '../types.js';

const userSchema = new mongoose.Schema<User>({
  username: { type: String, required: true, index: true, unique: true },
  email: String,
  passwordHash: { type: String, required: true, select: false },
  isAdmin: { type: Boolean, required: true, default: false },
});

export default mongoose.model<User>('User', userSchema);
