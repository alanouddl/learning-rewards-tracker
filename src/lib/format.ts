export const sar = (n: number | string) => {
  const v = Number(n);
  return `${v.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س`;
};
export const mins = (n: number) => {
  if (n < 60) return `${n} دقيقة`;
  const h = Math.floor(n / 60), m = n % 60;
  return m ? `${h} س ${m} د` : `${h} ساعة`;
};
export const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);
export const STATUS_LABEL = {
  not_started: 'لم يبدأ',
  in_progress: 'قيد التقدم',
  awaiting_approval: 'بانتظار الموافقة',
  completed: 'مكتمل',
} as const;
export const REWARD_STATUS = { pending: 'بانتظار الموافقة', approved: 'معتمدة', rejected: 'مرفوضة', paid: 'تم التسليم' } as const;
export const REWARD_KIND = { daily: 'هدف يومي', weekly: 'هدف أسبوعي', milestone: 'مرحلة كورس', bonus: 'مكافأة خاصة' } as const;
export const DIFFICULTY = { easy: 'سهل 😊', medium: 'متوسط 🙂', hard: 'صعب 😅' } as const;
