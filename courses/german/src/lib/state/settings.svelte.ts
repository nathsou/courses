/**
 * Learner settings, including the help dial: whether nouns are coloured by gender and whether
 * translations show straight away. Stored in this browser only.
 */
import { browser } from '$app/environment';
import { readJSON, writeJSON } from './storage';
import { tutorSettings, type TutorSettings, type Provider, type TutorConfig } from '$lib/tutor/providers';

/** Where the learner starts: new to German, or back at a level they once reached. */
export type StartPoint = 'new' | 'a1' | 'a2' | 'b1' | 'b2';

export interface SettingsData extends TutorSettings {
  /** Colour nouns by gender (der blue, die red, das green, plural grey). */
  genders: boolean;
  /** Show English translations of example sentences straight away. */
  translations: boolean;
  /** Speed for spoken audio (1 = natural). */
  rate: number;
  start: StartPoint | null;
  newPerDay: number;
  /** Type the German (rather than just recall it) on meaning cards in the review deck. */
  typeAnswers: boolean;
  /** Little chimes for right and wrong answers. */
  sounds: boolean;
  /** Accept "ae", "oe", "ue" and "ss" for ä, ö, ü and ß without comment in typed answers. */
  lenientSpelling: boolean;
}

const KEY = 'german:settings';
const DEFAULTS: SettingsData = {
  genders: true,
  translations: true,
  rate: 1,
  start: null,
  newPerDay: 12,
  typeAnswers: true,
  sounds: true,
  lenientSpelling: false,
  ...tutorSettings({}),
};

/** Help levels for each starting point: beginners see everything, returners less. */
export const START_DEFAULTS: Record<StartPoint, Partial<SettingsData>> = {
  new: { genders: true, translations: true },
  a1: { genders: true, translations: true },
  a2: { genders: true, translations: false },
  b1: { genders: false, translations: false },
  b2: { genders: false, translations: false },
};

class Settings {
  data: SettingsData = $state({ ...DEFAULTS });
  panelOpen = $state(false);
  private loaded = false;

  load(): void {
    if (this.loaded || !browser) return;
    this.loaded = true;
    this.read();
    this.apply();
    addEventListener('storage', (e) => {
      if (e.key === KEY) {
        this.read();
        this.apply();
      }
    });
  }

  set<K extends keyof SettingsData>(key: K, value: SettingsData[K]): void {
    this.data[key] = value;
    this.save();
  }

  private read(): void {
    const raw = readJSON<Partial<SettingsData>>(KEY, {});
    this.data = { ...DEFAULTS, ...raw, ...tutorSettings(raw) };
    delete (this.data as unknown as Record<string, unknown>).apiKey;
    delete (this.data as unknown as Record<string, unknown>).model;
  }

  setTutor(provider: Provider, patch: Partial<TutorConfig>): void {
    Object.assign(this.data.tutors[provider], patch);
    this.save();
  }

  get tutorConfig(): TutorConfig {
    return this.data.tutors[this.data.provider];
  }

  update(patch: Partial<SettingsData>): void {
    Object.assign(this.data, patch);
    this.save();
  }

  private save(): void {
    writeJSON(KEY, this.data);
    this.apply();
  }

  private apply(): void {
    if (!browser) return;
    const root = document.documentElement;
    if (this.data.genders) root.dataset.genders = 'on';
    else delete root.dataset.genders;
  }

  get tutorEnabled(): boolean {
    return this.tutorConfig.apiKey.trim().length > 0;
  }
}

export const settings = new Settings();
