import { ssr as _$ssr } from "solid-js/web";
import { escape as _$escape } from "solid-js/web";
import { ssrAttribute as _$ssrAttribute } from "solid-js/web";
import { ssrHydrationKey as _$ssrHydrationKey } from "solid-js/web";
var _tmpl$ = ["<div", " class=\"counter\"><h1>Counter</h1><p", ">Count: <!--$-->", "<!--/--></p><button>+1</button></div>"];
import { createSignal } from 'solid-js';
export function Counter() {
  const [count, setCount] = createSignal(0);
  return _$ssr(_tmpl$, _$ssrHydrationKey(), _$ssrAttribute("class", count() > 5 ? 'big' : '', false), _$escape(count()));
}