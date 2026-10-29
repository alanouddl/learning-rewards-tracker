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

/** Soft floating decorations for the page header. */
export function HeaderDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Flower className="absolute -left-4 -top-5 h-12 w-12 animate-floaty opacity-30" />
      <Sparkle className="absolute left-1/2 top-3 h-3 w-3 animate-twinkle" color="#c6b3f7" />
      <Star className="absolute right-1/3 top-2 h-3.5 w-3.5 animate-twinkle [animation-delay:.8s]" color="#9dcdf4" />
      <Flower className="absolute -bottom-5 left-1/3 h-9 w-9 animate-floaty opacity-30 [animation-delay:1.2s]" color="#c6b3f7" />
    </div>
  );
}
