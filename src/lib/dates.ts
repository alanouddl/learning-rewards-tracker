// All "days" are calendar dates in Saudi time, as YYYY-MM-DD strings. Weeks start on Sunday.
export const TZ = 'Asia/Riyadh';

export function todayStr(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: TZ });
}
export function addDays(d: string, n: number): string {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
export function dow(d: string): number {
  return new Date(d + 'T00:00:00Z').getUTCDay();
}
export function weekStart(d: string): string {
  return addDays(d, -dow(d));
}
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000);
}
export const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const DAY_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export function fmtDate(d: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }): string {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { ...opts, timeZone: 'UTC' });
}
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
export function greeting(now = new Date()): string {
  const h = Number(now.toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }));
  return h >= 4 && h < 12 ? 'صباح الخير' : 'مساء الخير';
}
