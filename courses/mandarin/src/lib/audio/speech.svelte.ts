/**
 * Speaking Chinese text. Clips generated ahead of time (scripts/generate-audio.ts) are listed in
 * static/audio/manifest.json and played when present; anything else falls back to the browser's
 * own Chinese voice, if it has one.
 */
import { base } from '$app/paths';
import { browser } from '$app/environment';
import { plain } from '$lib/zh/annotate';
import { settings } from '$lib/state/settings.svelte';

type Manifest = Record<string, string>;

/** A few milliseconds of silent WAV, played on the first tap to unlock audio on mobile. */
const SILENCE = 'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

/** The text a clip is keyed by: overrides stripped, whitespace trimmed. */
export const clipKey = (text: string) => plain(text).replace(/\s+/g, '').trim();

class Speech {
  /** The text currently being spoken, for highlighting play buttons. */
  playing: string | null = $state(null);
  /** Relative button speed, so normal and slow controls do not both appear active. */
  rate = $state(1);
  /** False once we know the browser has no Chinese voice and no clip exists. */
  voiceMissing = $state(false);
  private manifest: Promise<Manifest> | null = null;
  private audio: HTMLAudioElement | null = null;
  private token = 0;
  private finish: (() => void) | null = null;
  private pending: ReturnType<typeof setTimeout> | null = null;

  private loadManifest(): Promise<Manifest> {
    this.manifest ??= fetch(`${base}/audio/manifest.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    return this.manifest;
  }

  /** Warm the manifest so the first click plays immediately. */
  prepare(): void {
    if (!browser) return;
    void this.loadManifest();
    for (const type of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(type, this.unlock, { capture: true, passive: true });
  }

  async has(text: string): Promise<boolean> {
    return clipKey(text) in (await this.loadManifest());
  }

  stop(): void {
    this.token++;
    if (this.pending !== null) clearTimeout(this.pending);
    this.pending = null;
    this.finish?.();
    this.finish = null;
    this.audio?.pause();
    if (browser && 'speechSynthesis' in window) speechSynthesis.cancel();
    this.playing = null;
  }

  /** Delayed exercise prompts must not interrupt a newer playback request. */
  schedule(text: string, delay = 250): () => void {
    if (!browser) return () => {};
    if (this.pending !== null) clearTimeout(this.pending);
    const token = this.token;
    const timer = setTimeout(() => {
      if (this.pending === timer) this.pending = null;
      if (token === this.token) void this.say(text);
    }, delay);
    this.pending = timer;
    return () => {
      clearTimeout(timer);
      if (this.pending === timer) this.pending = null;
    };
  }

  /** Speak `text`; resolves when it finishes (or is interrupted). */
  async say(text: string, opts: { rate?: number } = {}): Promise<void> {
    if (!browser) return;
    this.stop();
    const token = this.token;
    this.rate = opts.rate ?? 1;
    const rate = this.rate * settings.data.rate;
    this.playing = text;
    const file = (await this.loadManifest())[clipKey(text)];
    if (token !== this.token) return;
    try {
      const played = file ? await this.playFile(`${base}/audio/${file}`, rate, token) : false;
      if (!played && token === this.token) await this.synthesise(plain(text), rate, token);
    } finally {
      if (token === this.token) this.playing = null;
    }
  }

  /**
   * One audio element for every clip. Mobile browsers only let an element play outside a tap once
   * it has played inside one, so a "play all" loop must keep using the element the tap unlocked.
   */
  private element(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
    }
    return this.audio;
  }

  /** Unlock audio and the speech voice on the learner's first tap or key press. */
  private unlock = () => {
    for (const type of ['pointerdown', 'keydown', 'touchend'] as const) window.removeEventListener(type, this.unlock, true);
    const a = this.element();
    if (!a.src) {
      a.src = SILENCE;
      a.play().then(() => (a.src === SILENCE ? a.pause() : undefined)).catch(() => {});
    }
    if ('speechSynthesis' in window && !speechSynthesis.speaking) {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  };

  /** Resolves true once the clip has played (or was paused by the system part-way through). */
  private playFile(src: string, rate: number, token: number): Promise<boolean> {
    return new Promise((resolve) => {
      const a = this.element();
      let settled = false;
      let started = false;
      const finish = (played: boolean) => {
        if (settled) return;
        settled = true;
        a.removeEventListener('playing', onPlaying);
        a.removeEventListener('ended', onEnded);
        a.removeEventListener('error', onError);
        a.removeEventListener('pause', onPause);
        if (this.finish === cancel) this.finish = null;
        resolve(played);
      };
      const cancel = () => finish(false);
      const onPlaying = () => (started = true);
      const onEnded = () => finish(true);
      const onError = () => finish(false);
      // A clip that reaches its end fires "pause" just before "ended"; a pause queued by an
      // earlier stop() arrives before this clip's "playing". Only a pause mid-clip ends it here.
      const onPause = () => {
        if (started && !a.ended) finish(true);
      };
      this.finish = cancel;
      a.addEventListener('playing', onPlaying);
      a.addEventListener('ended', onEnded);
      a.addEventListener('error', onError);
      a.addEventListener('pause', onPause);
      a.src = src;
      a.defaultPlaybackRate = rate;
      a.playbackRate = rate;
      a.preservesPitch = true;
      a.play().catch(() => finish(false));
      if (token !== this.token) a.pause();
    });
  }

  private voice(): SpeechSynthesisVoice | undefined {
    const voices = speechSynthesis.getVoices();
    const zh = voices.filter((v) => /^zh[-_](CN|Hans)/i.test(v.lang) || v.lang === 'zh');
    return zh.find((v) => /natural|neural|premium|enhanced/i.test(v.name)) ?? zh.find((v) => v.localService) ?? zh[0] ?? voices.find((v) => v.lang.startsWith('zh'));
  }

  private async synthesise(text: string, rate: number, token: number): Promise<void> {
    if (!('speechSynthesis' in window)) {
      this.voiceMissing = true;
      return;
    }
    if (!speechSynthesis.getVoices().length) {
      await new Promise<void>((r) => {
        speechSynthesis.addEventListener('voiceschanged', () => r(), { once: true });
        setTimeout(r, 800);
      });
    }
    if (token !== this.token) return;
    const voice = this.voice();
    this.voiceMissing = !voice;
    if (!voice) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    if (voice) u.voice = voice;
    u.rate = 0.9 * rate;
    await new Promise<void>((resolve) => {
      // Some voices never report the end (or never start outside a tap): do not wait forever.
      const watchdog = setTimeout(() => finish(), 2500 + (text.length * 700) / Math.max(0.3, u.rate));
      const finish = () => {
        clearTimeout(watchdog);
        if (this.finish === finish) this.finish = null;
        resolve();
      };
      this.finish = finish;
      u.onend = u.onerror = finish;
      speechSynthesis.speak(u);
    });
  }
}

export const speech = new Speech();
