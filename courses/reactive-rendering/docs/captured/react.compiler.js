import { c as _c } from "react/compiler-runtime";
import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Counter() {
  const $ = _c(9);
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
  if ($[4] !== count) {
    t3 = /*#__PURE__*/_jsx("button", {
      onClick: () => setCount(count + 1),
      children: "+1"
    });
    $[4] = count;
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  let t4;
  if ($[6] !== t2 || $[7] !== t3) {
    t4 = /*#__PURE__*/_jsxs("div", {
      className: "counter",
      children: [t0, t2, t3]
    });
    $[6] = t2;
    $[7] = t3;
    $[8] = t4;
  } else {
    t4 = $[8];
  }
  return t4;
}