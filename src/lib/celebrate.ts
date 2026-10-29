import confetti from 'canvas-confetti';

const colors = ['#f6a3c0', '#e05f8e', '#f6a1c1', '#ec5f94', '#ffffff', '#fbc7da'];

export function celebrate(big = false) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  confetti({ particleCount: big ? 180 : 90, spread: big ? 100 : 70, origin: { y: 0.65 }, colors, scalar: 0.9 });
  if (big) {
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 }, colors }), 250);
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 }, colors }), 400);
  }
}

// Remember which money milestones were already celebrated on this device (a convenience only).
export function takeNewThreshold(earned: number, thresholds: number[]): number | null {
  let seen: number[] = [];
  try { seen = JSON.parse(localStorage.getItem('celebrated') || '[]'); } catch { /* storage unavailable */ }
  const hit = thresholds.filter((t) => earned >= t && !seen.includes(t));
  if (!hit.length) return null;
  try { localStorage.setItem('celebrated', JSON.stringify([...seen, ...hit])); } catch { /* ignore */ }
  return hit[hit.length - 1];
}
