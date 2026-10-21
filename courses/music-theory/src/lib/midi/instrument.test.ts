import { describe, expect, it } from 'vitest';
import { decodeMidi, KEY_LAYOUT } from './messages';

describe('MIDI messages', () => {
  it('decodes note on, note off and the sustain pedal on any channel', () => {
    expect(decodeMidi([0x90, 60, 100])).toEqual({ kind: 'note', note: 60, velocity: 100, on: true });
    expect(decodeMidi([0x93, 64, 0])).toEqual({ kind: 'note', note: 64, velocity: 0, on: false });
    expect(decodeMidi([0x80, 60, 40])).toEqual({ kind: 'note', note: 60, velocity: 40, on: false });
    expect(decodeMidi([0xb0, 64, 127])).toEqual({ kind: 'sustain', down: true });
    expect(decodeMidi([0xb5, 64, 10])).toEqual({ kind: 'sustain', down: false });
    expect(decodeMidi([0xb0, 7, 100])).toBeUndefined();
    expect(decodeMidi([0xf8])).toBeUndefined();
  });
  it('lays out the computer keyboard chromatically from C', () => {
    const offsets = Object.values(KEY_LAYOUT).sort((a, b) => a - b);
    expect(offsets).toEqual([...Array(18).keys()]);
  });
});
