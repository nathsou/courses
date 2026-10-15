import { createSignal } from 'solid-js';
export function Counter() {
  const [count, setCount] = createSignal(0);
  return (
    <div class="counter">
      <h1>Counter</h1>
      <p class={count() > 5 ? 'big' : ''}>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>+1</button>
    </div>
  );
}