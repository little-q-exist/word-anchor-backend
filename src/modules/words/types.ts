import mongoose from 'mongoose';

export interface Definition {
  meaning: string;
  partOfSpeech: string;
}

export interface NewWord {
  definitions: Definition[];
  english: string;
  exampleSentence: string[];
  phonetic: string;
  related: string[];
  tags: string[];
}

export interface Word {
  definitions: Definition[];
  english: string;
  exampleSentence: string[];
  phonetic: string;
  related: string[];
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
}

export interface BriefWord {
  _id: mongoose.Types.ObjectId;
  english: string;
  status: 'idle' | 'passed' | 'failed';
}

export interface BriefWordListWithMode {
  /**
   * List of brief word objects in the selected mode.
   */
  words: BriefWord[];
  /**
   * @deprecated Use `words` instead. This field contains full `BriefWord` objects,
   * not IDs. It is kept only for backward compatibility.
   */
  wordIds?: BriefWord[];
  mode: 'learn' | 'review';
  count: number;
}
