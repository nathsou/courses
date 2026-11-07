/**
 * `after(tick, value)`: returns the last argument. Used in `$derived(...)` so that a value computed from a
 * plain (non-reactive) machine object is recomputed whenever the reactive `tick` that the animation bumps
 * changes: Svelte tracks the read of `tick` in the arguments.
 */
export function after<T>(...args: [...unknown[], T]): T {
  return args[args.length - 1] as T;
}
