export function Flower({ className = '', color = '#f9a8c7', center = '#fdefd6' }: { className?: string; color?: string; center?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="20" cy="10" rx="6.5" ry="9" fill={color} transform={`rotate(${a} 20 20)`} opacity=".9" />
      ))}
      <circle cx="20" cy="20" r="5.5" fill={center} />
    </svg>
  );
}

export function Star({ className = '', color = '#c6b3f7' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2l2.4 6.6L21 9.3l-5.2 4.3 1.7 6.9L12 16.8 6.5 20.5l1.7-6.9L3 9.3l6.6-.7z" fill={color} />
    </svg>
  );
}

export function Sparkle({ className = '', color = '#f9a8c7' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0z" fill={color} />
    </svg>
  );
}

/** A few pink sparkles, like the reference. */
export function HeaderDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden="true">
      <Sparkle className="absolute left-[38%] top-2 h-2.5 w-2.5 animate-twinkle" color="#f6a1c1" />
      <Sparkle className="absolute right-[42%] bottom-2 h-2 w-2 animate-twinkle [animation-delay:1s]" color="#ec5f94" />
    </div>
  );
}

/** Pink desk scene: laptop with stickers, tulips in a vase, a coffee cup. Drawn in SVG (no external images). */
export function DeskScene({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 240" className={className} role="img" aria-label="مكتب وردي مع لابتوب وزهور توليب">
      <defs>
        <linearGradient id="lap" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#fbd3e1" /><stop offset="1" stopColor="#f3a9c4" /></linearGradient>
        <linearGradient id="vase" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f9c2d6" /><stop offset="1" stopColor="#ee87aa" /></linearGradient>
      </defs>
      <ellipse cx="160" cy="214" rx="150" ry="18" fill="#fde3ed" />
      {/* neon sign */}
      <g transform="translate(28 18)">
        <rect width="78" height="62" rx="12" fill="#fff" stroke="#f6a1c1" strokeWidth="3" />
        <text x="39" y="25" textAnchor="middle" fontFamily="Aref Ruqaa, serif" fontSize="15" fill="#ec5f94">تعلّمي</text>
        <text x="39" y="46" textAnchor="middle" fontFamily="Aref Ruqaa, serif" fontSize="15" fill="#ec5f94">اكبري</text>
        <path d="M33 62 l6 9 l6 -9" fill="#fff" stroke="#f6a1c1" strokeWidth="3" strokeLinejoin="round" />
      </g>
      {/* laptop */}
      <g transform="translate(92 86) rotate(-6)">
        <rect width="150" height="96" rx="10" fill="url(#lap)" />
        <circle cx="75" cy="48" r="9" fill="#fff" opacity=".75" />
        <path d="M30 30 c-6 -8 -18 -2 -12 7 l12 10 l12 -10 c6 -9 -6 -15 -12 -7z" fill="#e5508a" />
        <rect x="104" y="58" width="30" height="18" rx="5" fill="#fff" />
        <path d="M112 67 l-4 0 M122 63 l-5 8 M126 67 l4 0" stroke="#e5508a" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="120" cy="24" r="10" fill="#fff" /><path d="M115 24 l3 3 l6 -6" stroke="#e5508a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      <path d="M78 190 l170 -18 l8 12 l-170 18z" fill="#f6a1c1" />
      {/* coffee cup */}
      <g transform="translate(46 150)">
        <path d="M0 0 h34 l-4 44 h-26z" fill="#fff" stroke="#fbd3e1" strokeWidth="2" />
        <rect x="-2" y="-6" width="38" height="8" rx="3" fill="#f7b1c9" />
        <path d="M17 30 c-3 -4 -8 -1 -5 3 l5 4 l5 -4 c3 -4 -2 -7 -5 -3z" fill="#ec5f94" />
      </g>
      {/* tulips */}
      <g transform="translate(250 92)">
        {[[-14, 0, -8], [0, -14, 0], [14, -4, 8]].map(([x, y, r], i) => (
          <g key={i}>
            <path d={`M${20 + x} ${40 + y} C ${20 + x} 70, 20 80, 20 96`} stroke="#8fc9a5" strokeWidth="3" fill="none" />
            <path d={`M${12 + x} ${30 + y} q0 -14 8 -18 q8 4 8 18 q-8 8 -16 0z`} fill="#f083a8" transform={`rotate(${r} ${20 + x} ${30 + y})`} />
          </g>
        ))}
        <path d="M2 92 h36 l-4 40 q-14 8 -28 0z" fill="url(#vase)" />
        <path d="M8 100 h24" stroke="#fff" strokeOpacity=".6" strokeWidth="2" />
      </g>
      {/* floating hearts & sparkles */}
      <path d="M290 40 c-4 -6 -12 -1 -8 5 l8 7 l8 -7 c4 -6 -4 -11 -8 -5z" fill="#f6a1c1" />
      <path d="M135 34 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z" fill="#ec5f94" />
      <path d="M210 52 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" fill="#f6a1c1" />
    </svg>
  );
}
