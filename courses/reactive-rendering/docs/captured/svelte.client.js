import 'svelte/internal/disclose-version';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="counter"><h1>Counter</h1> <p> </p> <button>+1</button></div>`);

export default function Counter($$anchor) {
	let count = $.state(0);
	var div = root();
	var p = $.sibling($.child(div), 2);
	var text = $.only_child(p);
	var button = $.sibling(p, 2);

	$.reset(div);

	$.template_effect(() => {
		$.set_class(p, 1, $.clsx($.get(count) > 5 ? 'big' : ''));
		$.set_text(text, `Count: ${$.get(count) ?? ''}`);
	});

	$.delegated('click', button, () => $.update(count));
	$.append($$anchor, div);
}

$.delegate(['click']);