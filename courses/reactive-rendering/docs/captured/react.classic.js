import { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Counter() {
  const [count, setCount] = useState(0);
  return /*#__PURE__*/_jsxs("div", {
    className: "counter",
    children: [/*#__PURE__*/_jsx("h1", {
      children: "Counter"
    }), /*#__PURE__*/_jsxs("p", {
      className: count > 5 ? 'big' : '',
      children: ["Count: ", count]
    }), /*#__PURE__*/_jsx("button", {
      onClick: () => setCount(count + 1),
      children: "+1"
    })]
  });
}