import dayjs from 'dayjs';
import { UserLearningData } from '../models/userWords.js';
import { supermemo } from './SM-2.js';

interface LearnReturnItem {
  data: UserLearningData;
  shouldRepeat: boolean;
}

export const learn = (data: UserLearningData, quality: number): LearnReturnItem => {
  const { easeFactor, interval, repetition, shouldRepeat } = supermemo(data, quality);
  const lastLearned = dayjs(Date.now()).toISOString();
  const dueDate = dayjs(lastLearned).add(interval, 'day').toISOString();
  data.easeFactor = easeFactor;
  data.repetition = repetition;
  data.interval = interval;
  data.lastLearned = lastLearned;
  data.dueDate = dueDate;
  return { data, shouldRepeat };
};
