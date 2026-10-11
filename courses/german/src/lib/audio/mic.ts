/**
 * Recording the learner (kept in memory on this device, never uploaded) and, where the browser
 * offers it, speech recognition. Chrome's recognition sends audio to Google, which the speaking
 * exercise says before using it.
 */

export class Mic {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  url: string | null = null;

  static get supported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  }

  get recording(): boolean {
    return this.recorder?.state === 'recording';
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start();
  }

  /** Stop and return an object URL for the recording. */
  stop(): Promise<string | null> {
    return new Promise((resolve) => {
      const r = this.recorder;
      if (!r || r.state === 'inactive') return resolve(this.url);
      r.onstop = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        if (this.url) URL.revokeObjectURL(this.url);
        this.url = this.chunks.length ? URL.createObjectURL(new Blob(this.chunks, { type: r.mimeType })) : null;
        resolve(this.url);
      };
      r.stop();
    });
  }

  dispose(): void {
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

function ctor(): (new () => Recognition) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined;
}

export const canRecognise = () => !!ctor();

/** Listen once in German; resolves with the best transcripts (empty if nothing was heard). */
export function recognise(signal?: AbortSignal): Promise<string[]> {
  const C = ctor();
  if (!C) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const r = new C();
    r.lang = 'de-DE';
    r.interimResults = false;
    r.maxAlternatives = 3;
    let out: string[] = [];
    r.onresult = (e) => {
      const first = e.results[0];
      out = first ? Array.from({ length: first.length }, (_, i) => first[i]!.transcript) : [];
    };
    r.onerror = (e) => (e.error === 'no-speech' || e.error === 'aborted' ? resolve([]) : reject(new Error(e.error)));
    r.onend = () => resolve(out);
    signal?.addEventListener('abort', () => r.abort());
    r.start();
  });
}

/** Compare what was heard with the target, word by word (case and punctuation ignored). */
export function compareWords(target: string, heard: string): { word: string; ok: boolean }[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean);
  const said = norm(heard);
  const used = new Set<number>();
  return target
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const w = norm(word)[0] ?? '';
      const i = said.findIndex((s, k) => !used.has(k) && s === w);
      if (i >= 0) used.add(i);
      return { word, ok: i >= 0 || !w };
    });
}
