import { useId } from 'react';

/** A glass jar that fills with "coins" as approved rewards grow. */
export function SavingsJar({ value, pending = 0, size = 180 }: { value: number; pending?: number; size?: number }) {
  const id = useId().replace(/:/g, '');
  const fill = Math.max(0, Math.min(1, value));
  const pend = Math.max(0, Math.min(1 - fill, pending));
  const top = 40, bottom = 196, h = bottom - top;
  const y = bottom - h * fill;
  const yp = y - h * pend;
  return (
    <svg viewBox="0 0 160 210" width={size} height={size * 1.31} role="img" aria-label={`الحصالة ممتلئة ${Math.round(fill * 100)}%`}>
      <defs>
        <clipPath id={`jar-${id}`}>
          <path d="M40 40 h80 q12 0 12 14 v4 q16 10 16 34 v86 q0 18 -18 18 h-100 q-18 0 -18 -18 v-86 q0 -24 16 -34 v-4 q0 -14 12 -14z" />
        </clipPath>
        <linearGradient id={`liq-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f6a3c0" />
          <stop offset="100%" stopColor="#e05f8e" />
        </linearGradient>
        <pattern id={`dots-${id}`} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="6" r="3" fill="#fbecc9" opacity=".75" />
          <circle cx="14" cy="14" r="2" fill="#fff" opacity=".4" />
        </pattern>
      </defs>
      {/* lid */}
      <rect x="34" y="18" width="92" height="22" rx="9" fill="#e5a634" />
      <rect x="44" y="12" width="72" height="10" rx="5" fill="#f2c46b" />
      <g clipPath={`url(#jar-${id})`}>
        <rect x="0" y="0" width="160" height="210" fill="#fff4f7" />
        {/* pending (lighter) */}
        <rect x="0" y={yp} width="160" height={bottom - yp + 20} fill="#f2c46b" opacity=".45" style={{ transition: 'y 1.2s ease-out' }} />
        {/* approved */}
        <g style={{ transform: `translateY(${y}px)`, transition: 'transform 1.4s cubic-bezier(.2,.8,.2,1)' }}>
          <g className="animate-wave">
            <path d="M0 6 q20 -10 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 v220 h-320z" fill={`url(#liq-${id})`} />
          </g>
          <rect x="0" y="6" width="160" height="220" fill={`url(#dots-${id})`} />
        </g>
      </g>
      {/* glass outline & shine */}
      <path d="M40 40 h80 q12 0 12 14 v4 q16 10 16 34 v86 q0 18 -18 18 h-100 q-18 0 -18 -18 v-86 q0 -24 16 -34 v-4 q0 -14 12 -14z"
        fill="none" stroke="#fbc7da" strokeWidth="4" />
      <path d="M30 100 q0 -18 10 -26" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".8" />
      <path d="M28 120 v40" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".6" />
      {/* heart label */}
      <path d="M80 128 c-10 -12 -24 -2 -16 10 l16 14 l16 -14 c8 -12 -6 -22 -16 -10z" fill="#fff" opacity=".85" />
    </svg>
  );
}
