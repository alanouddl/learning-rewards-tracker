import type { Data } from './store';
import { streak } from './plan';

import type { IconName } from '../components/Icon';

export type Badge = { id: string; icon: IconName; title: string; hint: string; earned: boolean };

export function badges(d: Data): Badge[] {
  const totalMin = d.checkins.filter((c) => c.status !== 'rejected').reduce((a, c) => a + c.minutes, 0);
  const { best } = streak(d);
  const earned = d.summary.earned;
  const approvedMs = d.milestones.filter((m) => m.status === 'approved').length;
  const doneCourses = d.courses.filter((c) => c.status === 'completed').length;
  return [
    { id: 'first', icon: 'sprout', title: 'البداية', hint: 'أول جلسة دراسة', earned: d.checkins.length > 0 },
    { id: 's3', icon: 'flame', title: '٣ أيام متتالية', hint: 'حققي هدفك ٣ أيام متتالية', earned: best >= 3 },
    { id: 's7', icon: 'rainbow', title: 'أسبوع كامل', hint: '٧ أيام دراسة متتالية', earned: best >= 7 },
    { id: 'h5', icon: 'hourglass', title: '٥ ساعات', hint: '٥ ساعات دراسة', earned: totalMin >= 300 },
    { id: 'h20', icon: 'book', title: '٢٠ ساعة', hint: '٢٠ ساعة دراسة', earned: totalMin >= 1200 },
    { id: 'm1', icon: 'flag', title: 'أول مرحلة', hint: 'اعتماد أول مرحلة كورس', earned: approvedMs >= 1 },
    { id: 'c1', icon: 'graduation', title: 'أول كورس', hint: 'إكمال أول كورس', earned: doneCourses >= 1 },
    { id: 'r100', icon: 'heart', title: '١٠٠ ريال', hint: 'أول ١٠٠ ريال', earned: earned >= 100 },
    { id: 'r500', icon: 'gem', title: '٥٠٠ ريال', hint: '٥٠٠ ريال مكتسبة', earned: earned >= 500 },
    { id: 'r1000', icon: 'crown', title: '١٠٠٠ ريال', hint: '١٠٠٠ ريال مكتسبة', earned: earned >= 1000 },
    { id: 'r2000', icon: 'rocket', title: '٢٠٠٠ ريال', hint: '٢٠٠٠ ريال مكتسبة', earned: earned >= 2000 },
    { id: 'r3000', icon: 'laptop', title: 'الهدف!', hint: '٣٠٠٠ ريال — جهاز أحلامك', earned: earned >= d.settings.total_budget },
  ];
}

export const MOTIVATION = [
  'كل دقيقة تدرسينها اليوم، تقرّبك من حلمك',
  'مو لازم تكونين مثالية، المهم تستمرين',
  'خطوة صغيرة كل يوم = إنجاز كبير',
  'أنتِ أقوى مما تتوقعين',
  'التعلّم رحلة، وأنتِ ماشية فيها صح',
  'اليوم فرصة جديدة، استمتعي فيها',
  'إذا فاتك يوم، عادي! المهم ترجعين بكرة',
];
export const motivationFor = (date: string) => MOTIVATION[Number(date.replace(/-/g, '')) % MOTIVATION.length];

export const THRESHOLDS = [100, 500, 1000, 2000, 3000];
