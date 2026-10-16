import { child as _child, next as _next, txt as _txt, on as _on, setClassName as _setClassName, toDisplayString as _toDisplayString, setText as _setText, renderEffect as _renderEffect, template as _template } from 'vue';
const t0 = _template("<div class=counter><h1>Counter</h1><p> </p><button>+1", 1)

export function render(_ctx, $props, $emit, $attrs, $slots) {
  const n2 = t0()
  const n0 = _next(_child(n2))
  const n1 = _next(n0)
  const x0 = _txt(n0)
  _on(n1, "click", () => (_ctx.count++))
  _renderEffect(() => {
    const _count = _ctx.count
    _setClassName(n0, ((_count > 5) ? 1 : 0), "big")
    _setText(x0, "Count: " + _toDisplayString(_count))
  })
  return n2
}