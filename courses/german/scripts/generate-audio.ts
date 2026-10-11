/**
 * Generates the course's audio with OpenAI text-to-speech, then checks every clip.
 *
 *   npm run audio -- [--env path/to/.env] [--model gpt-4o-mini-tts] [--voice coral]
 *                    [--tiers words,lessons,extras] [--limit 20] [--no-verify] [--dry-run]
 *
 * Reads OPENAI_API_KEY from the environment or a .env file: --env, else ./.env, the repository's
 * .env, or a .env in the folder that contains the repository. (Behind a proxy that adds the
 * credential itself, the key can be absent; run with NODE_USE_ENV_PROXY=1 so fetch uses it.)
 * Without --model it picks the newest steerable speech model the API lists (gpt-*-tts).
 *
 * Each clip is:
 *   1. synthesised, with instructions for clear standard German at a learner's pace;
 *   2. trimmed of leading and trailing silence and re-encoded as mono 40 kbps MP3 (needs ffmpeg);
 *   3. checked: transcribed (gpt-4o-transcribe) and compared with the text word by word.
 *      Failures are retried twice. Short items whose words are still wrong are left out of the
 *      manifest (the course falls back to the browser's voice). Every remaining problem is listed
 *      in static/audio/qa.json for a human to check.
 *
 * The list of texts is static/audio/texts.json (npm run audio:texts). Clips go to
 * static/audio/<hash>.mp3, listed in static/audio/manifest.json, which the player reads.
 * Existing clips are kept, so the script can be stopped and resumed.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const audioDir = join(root, 'static/audio');
const args = process.argv.slice(2);
const opt = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const flag = (name: string) => args.includes(`--${name}`);

function loadEnv(): void {
  const candidates = [opt('env'), join(process.cwd(), '.env'), join(root, '.env'), join(root, '../../.env'), join(root, '../../../.env')];
  for (const file of candidates) {
    if (!file || !existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.replace(/^(['"])(.*)\1$/, '$2');
    }
    console.log(`Read ${file}`);
    return;
  }
}

loadEnv();
const key = process.env.OPENAI_API_KEY;
if (!key && !flag('dry-run')) console.warn('OPENAI_API_KEY is not set; relying on the network to add credentials.');
const API = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const auth: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {};

async function pickModel(): Promise<string> {
  const chosen = opt('model') ?? process.env.OPENAI_TTS_MODEL;
  if (chosen) return chosen;
  try {
    const r = await fetch(`${API}/models`, { headers: auth });
    const { data } = (await r.json()) as { data: { id: string; created: number }[] };
    const steerable = data.filter((m) => /^gpt-.*tts/.test(m.id) && !/\d{4}-\d{2}-\d{2}$/.test(m.id)).sort((a, b) => b.created - a.created);
    if (steerable[0]) return steerable[0].id;
    if (data.some((m) => m.id === 'tts-1-hd')) return 'tts-1-hd';
  } catch {
    /* fall through */
  }
  return 'gpt-4o-mini-tts';
}

const INSTRUCTIONS = {
  short:
    'You are recording audio for a German course for English speakers. Say this German word or phrase on its own in clear, standard German (Hochdeutsch) with a neutral accent, as in a dictionary recording, at a calm pace. Pronounce the article with the noun. Say only the text, with no added words.',
  sentence:
    'You are recording audio for a German course for English speakers. Read this German text in clear, natural standard German (Hochdeutsch) with a neutral accent, at a relaxed, slightly slow pace, with warm, friendly intonation, as a native speaker would say it in conversation. Say only the text, with no added words or translations.',
};

const voice = opt('voice', process.env.OPENAI_TTS_VOICE ?? 'coral')!;
const tiers = new Set(opt('tiers', 'words,lessons,extras')!.split(','));
const limit = Number(opt('limit', '0'));
const concurrency = Number(opt('concurrency', '4'));
const verify = !flag('no-verify');
let ffmpeg = true;
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  ffmpeg = false;
  console.warn('ffmpeg not found: clips are saved as returned (larger, untrimmed) and tones are not checked.');
}

type Item = { text: string; tier: string };
const texts = (JSON.parse(readFileSync(join(audioDir, 'texts.json'), 'utf8')) as Item[]).filter((t) => tiers.has(t.tier));
const manifestPath = join(audioDir, 'manifest.json');
const qaPath = join(audioDir, 'qa.json');
const manifest: Record<string, string> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const qa: Record<string, { problem: string; heard?: string; kept: boolean }> = existsSync(qaPath) ? JSON.parse(readFileSync(qaPath, 'utf8')) : {};
const todo = texts.filter((t) => !manifest[t.text] || !existsSync(join(audioDir, manifest[t.text]!)));
const batch = limit ? todo.slice(0, limit) : todo;
console.log(`${texts.length} texts, ${texts.length - todo.length} already recorded, ${batch.length} to generate.`);
if (flag('dry-run') || !batch.length) process.exit(0);

const model = await pickModel();
console.log(`Model ${model}, voice ${voice}${verify ? ', checking every clip' : ''}.`);
const steerable = model.startsWith('gpt-');

function save(): void {
  const sort = <T>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(manifestPath, JSON.stringify(sort(manifest)).replace(/","/g, '",\n"') + '\n');
  writeFileSync(qaPath, JSON.stringify(sort(qa), null, 1) + '\n');
}

async function request(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, init);
    if (r.ok) return r;
    if ((r.status === 429 || r.status >= 500) && attempt < 6) {
      await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`${r.status}: ${(await r.text()).slice(0, 300)}`);
  }
}

async function speak(text: string): Promise<Buffer> {
  const isShort = text.split(/\s+/).length <= 3 && !/[.!?]/.test(text);
  const body: Record<string, unknown> = { model, voice, input: text, response_format: 'mp3' };
  if (steerable) body.instructions = isShort ? INSTRUCTIONS.short : INSTRUCTIONS.sentence;
  const r = await request(`${API}/audio/speech`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return Buffer.from(await r.arrayBuffer());
}

async function transcribe(mp3: Buffer): Promise<string> {
  const form = new FormData();
  form.append('model', 'gpt-4o-transcribe');
  form.append('language', 'de');
  form.append('prompt', 'Eine Aufnahme auf Hochdeutsch: ein Wort, ein Ausdruck oder ein Satz.');
  form.append('file', new Blob([new Uint8Array(mp3)], { type: 'audio/mpeg' }), 'clip.mp3');
  const r = await request(`${API}/audio/transcriptions`, { method: 'POST', headers: auth, body: form });
  return ((await r.json()) as { text: string }).text;
}

/** Trim silence and shrink: mono, 24 kHz, 40 kbps. */
function encode(raw: Buffer, id: string): Buffer {
  if (!ffmpeg) return raw;
  const src = join(tmpdir(), `${id}-in.mp3`);
  const out = join(tmpdir(), `${id}-out.mp3`);
  writeFileSync(src, raw);
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse';
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', trim, '-ac', '1', '-ar', '24000', '-b:a', '40k', out]);
  const mp3 = readFileSync(out);
  unlinkSync(src);
  unlinkSync(out);
  return mp3;
}

/** Words for comparison: lower case, umlauts kept, punctuation and numbers dropped. */
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

function distance(a: string[], b: string[]): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

type Problem = { problem: string; heard?: string };

/** Returns a problem description, or null when the clip sounds right. */
async function check(item: Item, mp3: Buffer): Promise<Problem | null> {
  const want = words(item.text);
  if (!want.length || /\d/.test(item.text)) return null;
  const heard = await transcribe(mp3);
  const got = words(heard);
  // Recognisers often mishear a word said on its own, so short items only fail if clearly longer.
  if (want.length <= 2) return got.length > want.length + 2 ? { problem: `heard “${heard}”`, heard } : null;
  const allowed = Math.max(1, Math.floor(want.length * 0.15));
  return distance(want, got) > allowed ? { problem: `heard “${heard}”`, heard } : null;
}

let done = 0;
let dropped = 0;
const queue = [...batch];
async function worker(n: number): Promise<void> {
  for (let t = queue.shift(); t; t = queue.shift()) {
    const file = `${createHash('sha1').update(`${t.text}|${voice}`).digest('hex').slice(0, 12)}.mp3`;
    try {
      let problem: Problem | null = null;
      let best: Buffer | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const mp3 = encode(await speak(t.text), `w${n}`);
        best = mp3;
        problem = verify ? await check(t, mp3) : null;
        if (!problem) break;
      }
      // Wrong words in a short clip: drop it. In a long one, keep it but list it for a human ear
      // (transcription is not perfect either).
      const keep = !problem || t.text.split(/\s+/).length > 4;
      if (problem) {
        qa[t.text] = { problem: problem.problem, heard: problem.heard, kept: keep };
        console.warn(`${keep ? 'kept, check' : 'dropped'}: ${t.text}: ${problem.problem}`);
      } else delete qa[t.text];
      if (keep && best) {
        writeFileSync(join(audioDir, file), best);
        manifest[t.text] = file;
        done++;
      } else dropped++;
      if ((done + dropped) % 25 === 0) {
        save();
        console.log(`${done + dropped} / ${batch.length}`);
      }
    } catch (e) {
      console.error(`${t.text}: ${(e as Error).message}`);
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, (_, n) => worker(n)));
save();
console.log(`Done: ${done} clips written, ${dropped} left to the browser voice. See static/audio/qa.json for anything to listen to.`);
