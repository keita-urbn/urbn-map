export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = typeof WEEKDAYS[number];
export const DAY_LABELS: Record<Weekday, string> = { mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日' };
export type HoursInterval = { open: string; close: string };
export type DayHours = { closed: boolean; intervals: HoursInterval[] };
export type BusinessHours = { timezone: string; weekly: Partial<Record<Weekday, DayHours>> };
export type OpeningStatus = 'open' | 'closed' | 'unknown';
const formatters = new Map<string, Intl.DateTimeFormat>();
export function minutes(value: string): number | null {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}
export function validDay(day: DayHours | undefined): boolean {
  return !!day && (day.closed === true || (day.closed === false && Array.isArray(day.intervals) && day.intervals.length > 0 && day.intervals.every(i => !!i && minutes(i.open) !== null && minutes(i.close) !== null && i.open !== i.close)));
}
export function validateBusinessHours(hours: BusinessHours | null | undefined): string | null {
  if (!hours) return null;
  try { new Intl.DateTimeFormat('en', { timeZone: hours.timezone }).format(); } catch { return 'タイムゾーンを確認してください'; }
  if (!hours.weekly || typeof hours.weekly !== "object" || Array.isArray(hours.weekly)) return "週間営業時間を確認してください";
  for (const day of WEEKDAYS) if (hours.weekly[day] && !validDay(hours.weekly[day])) return `${DAY_LABELS[day]}曜日の時刻をHH:mm形式で入力してください（開始と終了は別の時刻）`;
  return null;
}
export function localClock(timezone = 'Asia/Tokyo', now = new Date()): { day: Weekday; minute: number } | null {
  try {
    let formatter = formatters.get(timezone);
    if (!formatter) { formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); formatters.set(timezone, formatter); }
    const parts = formatter.formatToParts(now);
    const value = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    const day = value('weekday').toLowerCase() as Weekday;
    return WEEKDAYS.includes(day) ? { day, minute: Number(value('hour')) * 60 + Number(value('minute')) } : null;
  } catch { return null; }
}
export function getOpeningStatus(hours?: BusinessHours | null, now = new Date()): OpeningStatus {
  if (!hours?.weekly) return 'unknown';
  const clock = localClock(hours.timezone || 'Asia/Tokyo', now);
  if (!clock) return 'unknown';
  const today = hours.weekly[clock.day];
  const previous = hours.weekly[WEEKDAYS[(WEEKDAYS.indexOf(clock.day) + 6) % 7]];
  // An overnight interval belongs to the day it starts. Opening is inclusive,
  // closing exclusive; a closed day still allows yesterday's overnight spill.
  if (validDay(previous) && !previous!.closed && previous!.intervals.some(i => minutes(i.close)! < minutes(i.open)! && clock.minute < minutes(i.close)!)) return 'open';
  if (!validDay(today)) return 'unknown';
  if (!today!.closed && today!.intervals.some(i => {
    const open = minutes(i.open)!, close = minutes(i.close)!;
    return close < open ? clock.minute >= open : clock.minute >= open && clock.minute < close;
  })) return 'open';
  return 'closed';
}
export function formatDayHours(day?: DayHours): string {
  if (!validDay(day)) return '情報なし';
  if (day!.closed) return '定休日';
  return day!.intervals.map(i => `${i.open}–${i.close}${minutes(i.close)! < minutes(i.open)! ? '（翌日）' : ''}`).join(' / ');
}
export const STATUS_ACCENTS: Record<OpeningStatus, string> = { open: '#22c55e', closed: '#ef4444', unknown: '#9ca3af' };

export function todayHoursText(hours: BusinessHours, now = new Date()): string {
  const clock = localClock(hours.timezone, now);
  if (!clock) return '情報なし';
  const previous = hours.weekly?.[WEEKDAYS[(WEEKDAYS.indexOf(clock.day) + 6) % 7]];
  const spill = validDay(previous) && !previous!.closed ? previous!.intervals.find(i => minutes(i.close)! < minutes(i.open)! && clock.minute < minutes(i.close)!) : undefined;
  const today = hours.weekly?.[clock.day];
  const text = formatDayHours(today);
  if (!spill) return text;
  return `${today?.closed || !validDay(today) ? '' : text + ' · '}前日から${spill.close}まで営業`;
}
