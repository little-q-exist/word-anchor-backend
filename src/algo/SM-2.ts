import type { UserLearningData } from '../models/users.js';

interface supermemoReturnItem {
  newEaseFactor: number;
  newInterval: number;
  newRepetition: number;
  shouldRepeat: boolean;
}

const calculateRepetition = (quality: number, repetition: number) => {
  if (quality >= 3) {
    return repetition + 1;
  } else {
    return 1;
  }
};

const calculateEaseFactor = (quality: number, easeFactor: number) => {
  if (quality < 3) {
    return easeFactor;
  }
  const newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(1.3, Math.min(2.5, newEaseFactor));
};

const calculateInterval = (interval: number, repetition: number, easeFactor: number) => {
  if (repetition === 1) {
    return 1;
  } else if (repetition === 2) {
    return 6;
  } else {
    return Math.ceil(interval * easeFactor);
  }
};

/** call this to calculate easefactor and interval
 *  after submitted learning result.
 *  ONLY call it during the first review  */
export const supermemo = (
  { easeFactor, interval, repetition }: UserLearningData,
  quality: number
): supermemoReturnItem => {
  const newRepetition = calculateRepetition(quality, repetition);
  const newInterval = calculateInterval(interval, newRepetition, easeFactor);
  const newEaseFactor = calculateEaseFactor(quality, easeFactor);

  return { newEaseFactor, newInterval, newRepetition, shouldRepeat: quality < 4 };
};
