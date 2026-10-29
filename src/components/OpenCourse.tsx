import { I } from './Icon';
import type { Course } from '../lib/types';

export function OpenCourseButton({ course, big }: { course: Course | undefined; big?: boolean }) {
  if (!course) return null;
  if (!course.url) {
    return <span className={`btn bg-cream-100 text-plum-faint ${big ? 'w-full py-3.5 text-lg' : ''}`}><I n="link" /> الرابط قريباً</span>;
  }
  return (
    <a href={course.url} target="_blank" rel="noopener noreferrer"
      className={`btn-primary ${big ? 'w-full py-3.5 text-lg' : ''}`}>
      افتحي الكورس <span aria-hidden="true"><I n="external" /></span>
    </a>
  );
}
