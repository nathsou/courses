import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = { class: "counter" }

export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _cache[1] || (_cache[1] = _createElementVNode("h1", null, "Counter", -1 /* CACHED */)),
    _createElementVNode("p", {
      class: _normalizeClass($setup.count > 5 ? 'big' : '')
    }, "Count: " + _toDisplayString($setup.count), 3 /* TEXT, CLASS */),
    _createElementVNode("button", {
      onClick: _cache[0] || (_cache[0] = $event => ($setup.count++))
    }, "+1")
  ]))
}