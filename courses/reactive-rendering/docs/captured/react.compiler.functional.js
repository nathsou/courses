import { c as _c } from "react/compiler-runtime";
import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Counter() {
  const $ = _c(7);
  const [count, setCount] = useState(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = /*#__PURE__*/_jsx("h1", {
      children: "Counter"
    });
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const t1 = count > 5 ? "big" : "";
  let t2;
  if ($[1] !== count || $[2] !== t1) {
    t2 = /*#__PURE__*/_jsxs("p", {
      className: t1,
      children: ["Count: ", count]
    });
    $[1] = count;
    $[2] = t1;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = /*#__PURE__*/_jsx("button", {
      onClick: () => setCount(_temp),
      children: "+1"
    });
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  let t4;
  if ($[5] !== t2) {
    t4 = /*#__PURE__*/_jsxs("div", {
      className: "counter",
      children: [t0, t2, t3]
    });
    $[5] = t2;
    $[6] = t4;
  } else {
    t4 = $[6];
  }
  return t4;
}
function _temp(c) {
  return c + 1;
}
