import UserWord from '#modules/learn/models/userWords.js';
import type { UserLearningData } from '#modules/learn/types.js';
import type { SessionWordState } from '#modules/learn/models/learningSessions.js';
import Word from '#modules/words/models/words.js';
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

  static async getWordToLearn(userId: string, limit: number = 25): Promise<SessionWordState[]> {
    const learnedWordIds = await UserWord.find({
      userId,
      lastLearned: { $exists: true },
    }).distinct('wordId');

    const wordDocs = await Word.find({ _id: { $nin: learnedWordIds } }, '_id english')
      .limit(Number(limit))
      .lean();

    return wordDocs.map((word) => ({
      _id: word._id.toString(),
      english: word.english,
      status: 'idle',
    }));
  }

  static async getWordToReview(userId: string, limit: number = 25): Promise<SessionWordState[]> {
    const endOfDay = TimeService.getEndOfToday();

    const overDueDataIds = await UserWord.find({
      userId,
      dueDate: { $lte: endOfDay },
    })
      .sort({ dueDate: 'asc', easeFactor: 'asc' })
      .select('wordId english')
      .limit(Number(limit))
      .lean();

    return overDueDataIds.map((item) => ({
      _id: item.wordId.toString(),
      english: item.english,
      status: 'idle',
    }));
  }
}
