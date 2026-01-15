export class GoogleCalendarUtils {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  static parseDate(date: Date | string | unknown): Date {
    let dateObj: Date;

    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = new Date(String(date));
    }

    if (isNaN(dateObj.getTime())) {
      const dateStr = date instanceof Date ? date.toISOString() : String(date);
      throw new Error(`Invalid date: ${dateStr}`);
    }

    return dateObj;
  }

  static calculateDateTime(date: Date, startTime: string): Date {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const timeMatch: RegExpMatchArray | null = startTime.match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
    );
    if (!timeMatch) {
      throw new Error(`Invalid time format: ${startTime}`);
    }

    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`Invalid time: ${startTime}`);
    }

    const dateTimeStr = `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    const dateTime = new Date(dateTimeStr);

    if (isNaN(dateTime.getTime())) {
      throw new Error(`Invalid date/time after conversion: ${dateTimeStr}`);
    }

    return dateTime;
  }

  static getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
