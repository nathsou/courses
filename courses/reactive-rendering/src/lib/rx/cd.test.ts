import { describe, expect, test } from 'vitest';
import { allViews, buildViews, handle, sampleApp } from './cd';

const total = (strategy: 'default' | 'onpush') => allViews(buildViews(sampleApp(strategy))).reduce((n, v) => n + v.bindings, 0);

describe('change detection model', () => {
  test('with Default everywhere, any task re-checks every binding in the app', () => {
    const root = buildViews(sampleApp('default'));
    const t = handle(root, 'zone', { kind: 'timer' })!;
    expect(t.bindings).toBe(total('default'));
    expect(t.checked).toHaveLength(allViews(root).length);
  });

  test('with OnPush, an unrelated timer still ticks but only checks the Default root', () => {
    const root = buildViews(sampleApp('onpush'));
    const t = handle(root, 'zone', { kind: 'timer' })!;
    expect(t.checked).toEqual(['App']);
    expect(t.bindings).toBe(3);
  });

  test('a click in a row re-checks the row and every ancestor on the way down, nothing else', () => {
    const root = buildViews(sampleApp('onpush'));
    const t = handle(root, 'zone', { kind: 'click', view: 'Row3' })!;
    expect(t.checked).toEqual(['App', 'Main', 'Table', 'Row3']);
    expect(t.visited).toEqual(['App', 'Main', 'Table', 'Row3']);
    expect(t.bindings).toBe(3 + 8 + 10 + 4);
  });

  test('a signal read by a row refreshes only the row; its ancestors are traversed, not re-evaluated', () => {
    const root = buildViews(sampleApp('onpush'));
    const t = handle(root, 'zoneless', { kind: 'signal', view: 'Row3' })!;
    expect(t.visited).toEqual(['App', 'Main', 'Table', 'Row3']);
    expect(t.checked).toEqual(['App', 'Row3']); // App is Default, so it is checked whenever it is reached
    expect(t.bindings).toBe(3 + 4);
  });

  test('zoneless: an unrelated async task causes no tick at all', () => {
    const root = buildViews(sampleApp('onpush'));
    expect(handle(root, 'zoneless', { kind: 'timer' })).toBeNull();
    expect(handle(root, 'zone', { kind: 'timer' })).not.toBeNull();
  });

  test('a click and a signal in the same row: the signal is cheaper because the ancestors are not re-evaluated', () => {
    const viaEvent = handle(buildViews(sampleApp('onpush')), 'zone', { kind: 'click', view: 'Row1' })!;
    const viaSignal = handle(buildViews(sampleApp('onpush')), 'zoneless', { kind: 'signal', view: 'Row1' })!;
    expect(viaEvent.bindings).toBe(3 + 8 + 10 + 4);
    expect(viaSignal.bindings).toBe(3 + 4);
  });

  test('flags are cleared after a tick', () => {
    const root = buildViews(sampleApp('onpush'));
    handle(root, 'zone', { kind: 'markForCheck', view: 'Row1' });
    const again = handle(root, 'zone', { kind: 'timer' })!;
    expect(again.checked).toEqual(['App']);
  });
});
