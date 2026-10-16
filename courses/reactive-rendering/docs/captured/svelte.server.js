import * as $ from 'svelte/internal/server';

export default function Counter($$renderer) {
	let count = 0;

	$$renderer.push(`<div class="counter"><h1>Counter</h1> <p${$.attr_class($.clsx(count > 5 ? 'big' : ''))}>Count: ${$.escape(count)}</p> <button>+1</button></div>`);
}