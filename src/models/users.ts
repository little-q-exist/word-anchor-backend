import mongoose from 'mongoose';

export interface NewUser {
  username: string;
  email?: string;
  password: string;
}

export interface User {
  username: string;
  email?: string;
  passwordHash: string;
  isAdmin: boolean;
}

const userSchema = new mongoose.Schema<User>({
  username: { type: String, required: true, index: 1 },
  email: String,
  passwordHash: { type: String, required: true, select: false },
  isAdmin: { type: Boolean, required: true, default: false },
});

export default mongoose.model<User>('User', userSchema);
