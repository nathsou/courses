import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = { class: "counter" }

import { ref } from 'vue';

export default {
  __name: 'Counter',
  setup(__props) {

const count = ref(0);

return (_ctx, _cache) => {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _cache[1] || (_cache[1] = _createElementVNode("h1", null, "Counter", -1 /* CACHED */)),
    _createElementVNode("p", {
      class: _normalizeClass(count.value > 5 ? 'big' : '')
    }, "Count: " + _toDisplayString(count.value), 3 /* TEXT, CLASS */),
    _createElementVNode("button", {
      onClick: _cache[0] || (_cache[0] = $event => (count.value++))
    }, "+1")
  ]))
}
}

}