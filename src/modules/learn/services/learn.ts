import { UserLearningData } from '#modules/learn/models/userWords.js';
import { supermemo } from './SM-2.js';
import { TimeService } from './time.js';

interface LearnReturnItem {
  data: UserLearningData;
  shouldRepeat: boolean;
}

export class LearnService {
  static learn = (data: UserLearningData, quality: number): LearnReturnItem => {
    const { easeFactor, interval, repetition, shouldRepeat } = supermemo(data, quality);

    const lastLearned = TimeService.getCurrentTimeStamp();
    const dueDate = TimeService.addDaysToDate(lastLearned, interval);

    return {
      data: { ...data, easeFactor, repetition, interval, lastLearned, dueDate },
      shouldRepeat,
    };
  };
}
