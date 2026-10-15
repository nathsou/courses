import { useState } from 'react';
export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="counter">
      <h1>Counter</h1>
      <p className={count > 5 ? 'big' : ''}>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}