import { template as _$template } from "solid-js/web";
import { delegateEvents as _$delegateEvents } from "solid-js/web";
import { className as _$className } from "solid-js/web";
import { effect as _$effect } from "solid-js/web";
import { insert as _$insert } from "solid-js/web";
var _tmpl$ = /*#__PURE__*/_$template(`<div class=counter><h1>Counter</h1><p>Count: </p><button>+1`);
import { createSignal } from 'solid-js';
export function Counter() {
  const [count, setCount] = createSignal(0);
  return (() => {
    var _el$ = _tmpl$(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.nextSibling,
      _el$4 = _el$3.firstChild,
      _el$5 = _el$3.nextSibling;
    _$insert(_el$3, count, null);
    _el$5.$$click = () => setCount(count() + 1);
    _$effect(() => _$className(_el$3, count() > 5 ? 'big' : ''));
    return _el$;
  })();
}
_$delegateEvents(["click"]);