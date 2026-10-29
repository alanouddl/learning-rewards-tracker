// The app is a single page that never reloads itself, so a tab left open would keep an old
// version forever. Every few minutes (and when the tab comes back into view) check whether a
// newer build has been published, and reload if so.
const current = document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/index-"]')?.src.split('/').pop();

async function check() {
  if (!current) return; // dev server
  try {
    const html = await (await fetch(`./index.html?t=${Date.now()}`, { cache: 'no-store' })).text();
    const latest = html.match(/assets\/(index-[^"']+\.js)/)?.[1];
    if (latest && latest !== current) location.reload();
  } catch { /* offline: try again later */ }
}

export function startAutoUpdate() {
  setInterval(check, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
}

export const BUILD = __BUILD__;
