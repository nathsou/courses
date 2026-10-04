import { browser } from '$app/environment';

export function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(`human-evolution:${key}`) ?? 'null') ?? fallback; }
  catch { return fallback; }
}
export function save(key: string, value: unknown): boolean {
  try { localStorage.setItem(`human-evolution:${key}`, JSON.stringify(value)); return true; }
  catch { return false; }
}
export const preferences = $state({ videos: false, theme: 'system', reviewed: [] as string[], ready: false });
export function initPreferences() {
  if (!browser) return () => {};
  preferences.videos = read<boolean>('videos', false) === true;
  const reviewed = read<unknown>('reviewed', []);
  preferences.reviewed = Array.isArray(reviewed) ? reviewed.filter((x): x is string => typeof x === 'string') : [];
  let stored: string | null = null;
  try { stored = localStorage.getItem('theme'); } catch {}
  preferences.theme = stored === 'light' || stored === 'dark' ? stored : 'system';
  preferences.ready = true;
  const media = matchMedia('(prefers-color-scheme: dark)');
  const apply = () => { document.documentElement.dataset.theme = preferences.theme === 'system' ? (media.matches ? 'dark' : 'light') : preferences.theme; };
  apply(); media.addEventListener('change', apply);
  return () => media.removeEventListener('change', apply);
}
export function setTheme(choice: string) {
  preferences.theme = choice;
  try { localStorage.setItem('theme', choice); } catch {}
  document.documentElement.dataset.theme = choice === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : choice;
}
export function setVideos(on: boolean) { preferences.videos = on; save('videos', on); }
export function review(slug: string, on: boolean) {
  preferences.reviewed = on ? [...new Set([...preferences.reviewed, slug])] : preferences.reviewed.filter(x => x !== slug);
  save('reviewed', preferences.reviewed);
}
