import Word from '../models/words.js';

export const getAll = () => {
  return Word.find({});
};
