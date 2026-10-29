import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
});

// Students can log in with a short username; it maps to a placeholder email.
export const USERNAME_DOMAIN = 'family.invalid';
export function toLoginEmail(input: string) {
  const v = input.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${USERNAME_DOMAIN}`;
}

// Turn database errors into friendly Arabic messages.
export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message || String(e);
  if (msg.includes('BUDGET')) {
    if (msg.includes('exceed the total budget')) return 'لا يمكن: مجموع توزيع المكافآت سيتجاوز الميزانية الكلية.';
    if (msg.includes('reserved for milestones')) return 'لا يمكن: مكافآت المراحل في هذا المجال أكبر من المبلغ المخصص للمراحل.';
    if (msg.includes('daily pool')) return 'لا يمكن: رصيد المكافآت اليومية أقل مما تم صرفه سابقاً.';
    if (msg.includes('no room')) return 'لا يوجد رصيد متبقٍ في صندوق المكافآت اليومية.';
    return 'لا يمكن تجاوز ميزانية المكافآت.';
  }
  if (msg.includes('Invalid login credentials')) return 'اسم المستخدم أو كلمة المرور غير صحيحة.';
  if (msg.includes('last 7 days')) return 'يمكن تسجيل الدراسة لليوم أو آخر ٧ أيام فقط.';
  if (msg.includes('what you finished')) return 'اكتبي ماذا أنجزتِ اليوم 🌸';
  if (msg.includes('already has a reward')) return 'هذه المرحلة لها مكافأة مسجلة، لا يمكن حذفها أو تغيير مبلغها.';
  if (msg.includes('violates foreign key') || msg.includes('restrict')) return 'لا يمكن الحذف لأن هناك بيانات مرتبطة. يمكنك أرشفة العنصر بدلاً من ذلك.';
  if (msg.includes('url_check') || msg.includes('thumbnail_url_check')) return 'الرابط يجب أن يبدأ بـ https://';
  if (msg.includes('Failed to fetch')) return 'تعذّر الاتصال. تأكدي من الإنترنت وحاولي مرة ثانية.';
  return msg;
}
