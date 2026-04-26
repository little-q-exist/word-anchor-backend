import UserWord, { UserLearningData } from '#modules/learn/models/userWords.js';
import { supermemo } from './SM-2.js';
import { TimeService } from './time.js';
import mongoose from 'mongoose';

interface LearnReturnItem {
  data: UserLearningData;
  shouldRepeat: boolean;
}

interface UserLearningDataWithRepeatFlag extends UserLearningData {
  shouldRepeat: boolean;
}

export class LearnService {
  static defaultUserLearningData = {
    easeFactor: 2.5,
    interval: 0,
    repetition: 0,
    favorited: false,
  };

  static async upsertLearningData(
    userId: string,
    wordId: string,
    wordDoc: { english: string },
    quality: number
  ): Promise<UserLearningDataWithRepeatFlag> {
    const userWordDocument = await UserWord.findOne({ userId, wordId });
    if (!userWordDocument) {
      const newData: UserLearningData = {
        userId: new mongoose.Types.ObjectId(userId),
        wordId: new mongoose.Types.ObjectId(wordId),
        english: wordDoc.english,
        ...this.defaultUserLearningData,
      };
      const learnResult = this.learn(newData, quality);
      return {
        ...(await new UserWord(learnResult.data).save()).toObject(),
        shouldRepeat: learnResult.shouldRepeat,
      };
    } else {
      const userLearningData = userWordDocument.toObject();
      if (!userLearningData.english && wordDoc.english) {
        userLearningData.english = wordDoc.english;
      }
      const learnResult = this.learn(userLearningData, quality);
      return {
        ...(await userWordDocument.set(learnResult.data).save()).toObject(),
        shouldRepeat: learnResult.shouldRepeat,
      };
    }
  }

  private static learn = (data: UserLearningData, quality: number): LearnReturnItem => {
    const { easeFactor, interval, repetition, shouldRepeat } = supermemo(data, quality);

    const lastLearned = TimeService.getCurrentTimeStamp();
    const dueDate = TimeService.addDaysToDate(lastLearned, interval);

    return {
      data: { ...data, easeFactor, repetition, interval, lastLearned, dueDate },
      shouldRepeat,
    };
  };
}
