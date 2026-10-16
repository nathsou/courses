import { describe, expect, test } from 'vitest';
import { Scope } from './digest';

describe('Scope.$digest', () => {
  test('calls the listener on the first digest and whenever the watched value changes', () => {
    const scope = new Scope();
    scope.name = 'Ann';
    const seen: unknown[][] = [];
    scope.$watch((s) => s.name, (n, o) => seen.push([n, o]));
    scope.$digest();
    scope.$digest(); // no change: no call
    scope.name = 'Bob';
    scope.$digest();
    expect(seen).toEqual([['Ann', 'Ann'], ['Bob', 'Ann']]);
  });

  test('keeps looping while listeners change what other watchers read', () => {
    const scope = new Scope();
    scope.a = 1;
    scope.b = 0;
    scope.$watch((s) => s.a, (a) => (scope.b = a * 2));
    const bs: number[] = [];
    scope.$watch((s) => s.b, (b) => bs.push(b));
    const passes = scope.$digest();
    expect(bs).toEqual([2]);
    expect(passes).toBe(2);
  });

  test('aborts after 10 passes when two watchers keep changing each other', () => {
    const scope = new Scope();
    scope.x = 0;
    scope.y = 0;
    scope.$watch((s) => s.x, () => scope.y++);
    scope.$watch((s) => s.y, () => scope.x++);
    expect(() => scope.$digest()).toThrow('10 $digest() iterations reached');
  });

  test('$apply runs the function and then digests', () => {
    const scope = new Scope();
    scope.n = 0;
    let heard = -1;
    scope.$watch((s) => s.n, (n) => (heard = n));
    scope.$apply((s) => (s.n = 5));
    expect(heard).toBe(5);
  });

  test('value watchers compare structure; reference watchers compare identity', () => {
    const scope = new Scope();
    scope.list = [1, 2];
    let byRef = 0;
    let byValue = 0;
    scope.$watch((s) => s.list, () => byRef++);
    scope.$watch((s) => s.list, () => byValue++, true);
    scope.$digest();
    scope.list.push(3);
    scope.$digest();
    scope.list = [1, 2, 3]; // new array, same contents
    scope.$digest();
    expect([byRef, byValue]).toEqual([2, 2]);
  });

  test('child scopes inherit, and a digest from the root visits them', () => {
    const root = new Scope();
    root.title = 'T';
    const child = root.$new();
    const seen: string[] = [];
    child.$watch((s) => s.title, (t) => seen.push(t));
    root.$digest();
    root.title = 'U';
    root.$digest();
    expect(seen).toEqual(['T', 'U']);
    expect(root.$watcherCount()).toBe(1);
  });

  test('the cost of a digest is watchers × passes, whatever changed', () => {
    const scope = new Scope();
    scope.n = 0;
    for (let i = 0; i < 100; i++) scope.$watch((s) => s.n + i, () => {});
    scope.$digest();
    const before = scope.$$stats.watchCalls;
    scope.$apply((s) => (s.unrelated = 1));
    expect(scope.$$stats.watchCalls - before).toBe(100); // one clean pass over 100 watchers, for a change nobody watches
    scope.$apply((s) => s.n++);
    expect(scope.$$stats.watchCalls - before).toBe(100 + 200);
  });

  test('a deregistered watcher stops being called', () => {
    const scope = new Scope();
    scope.v = 1;
    let calls = 0;
    const off = scope.$watch((s) => s.v, () => calls++);
    scope.$digest();
    off();
    scope.v = 2;
    scope.$digest();
    expect(calls).toBe(1);
  });

  test('$evalAsync runs before the next pass', () => {
    const scope = new Scope();
    scope.v = 0;
    const log: string[] = [];
    scope.$watch((s) => s.v, (v) => log.push(`watch ${v}`));
    scope.$evalAsync((s) => ((s.v = 1), log.push('async')));
    scope.$digest();
    expect(log).toEqual(['async', 'watch 1']);
  });
});
