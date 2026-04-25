import dayjs from 'dayjs';

export class TimeService {
  static getCurrentTimeStamp = (): string => dayjs(Date.now()).toISOString();

  static addDaysToDate = (date: string, days: number): string =>
    dayjs(date).add(days, 'day').toISOString();

  static getStartOfToday = (): string => dayjs().startOf('day').toISOString();
  static getEndOfToday = (): string => dayjs().endOf('day').toISOString();
}
