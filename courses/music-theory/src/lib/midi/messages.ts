/** Pure helpers for the instrument: MIDI decoding and the computer-keyboard layout. */

/** Physical keys (KeyboardEvent.code) → semitones above the current base C: the usual DAW layout. */
export const KEY_LAYOUT: Record<string, number> = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11,
  KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
};

/** Decode one MIDI message; undefined for anything but note on/off and the sustain pedal. */
export function decodeMidi(data: ArrayLike<number>): { kind: 'note'; note: number; velocity: number; on: boolean } | { kind: 'sustain'; down: boolean } | undefined {
  const status = data[0] ?? 0;
  const type = status & 0xf0;
  if (type === 0x90 && data.length >= 3) return { kind: 'note', note: data[1]!, velocity: data[2]!, on: data[2]! > 0 };
  if (type === 0x80 && data.length >= 3) return { kind: 'note', note: data[1]!, velocity: data[2]!, on: false };
  if (type === 0xb0 && data[1] === 64) return { kind: 'sustain', down: (data[2] ?? 0) >= 64 };
  return undefined;
}
