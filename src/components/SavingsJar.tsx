import { useId } from 'react';

/** A glass jar that fills as approved rewards grow (lighter band = waiting for approval). */
export function SavingsJar({ value, pending = 0, size = 150 }: { value: number; pending?: number; size?: number }) {
  const id = useId().replace(/:/g, '');
  const fill = Math.max(0, Math.min(1, value));
  const pend = Math.max(0, Math.min(1 - fill, pending));
  const top = 46, bottom = 172, h = bottom - top;
  const y = bottom - h * fill;
  const yp = y - h * pend;
  const body = 'M38 28h74q10 0 10 12v6q14 9 14 30v80q0 16-16 16H30q-16 0-16-16V76q0-21 14-30v-6q0-12 10-12z';
  return (
    <svg viewBox="0 0 150 190" width={size} height={size * 1.27} role="img" aria-label={`الحصالة ممتلئة ${Math.round(fill * 100)}%`}>
      <defs><clipPath id={`j-${id}`}><path d={body} /></clipPath></defs>
      <rect x="35" y="10" width="80" height="18" rx="8" className="fill-peach-300" />
      <path d={body} fill="#fff" className="stroke-lav-200" strokeWidth="4" />
      <g clipPath={`url(#j-${id})`}>
        <rect x="0" y={yp} width="150" height={bottom - yp + 30} className="fill-lav-200" style={{ transition: 'y 1.2s ease-out' }} />
        <g style={{ transform: `translateY(${y}px)`, transition: 'transform 1.4s cubic-bezier(.2,.8,.2,1)' }}>
          <g className="animate-wave"><path d="M0 6 q19 -8 38 0 t38 0 t38 0 t38 0 t38 0 t38 0 t38 0 t38 0 v200 h-304z" className="fill-blush-400" /></g>
          <circle cx="52" cy="34" r="7" fill="#ffd54f" />
          <circle cx="94" cy="46" r="6" fill="#80cbc4" />
          <circle cx="76" cy="22" r="4" fill="#fff" opacity=".6" />
        </g>
      </g>
      <path d="M30 70 q0 -14 9 -20" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".9" />
    </svg>
  );
}
