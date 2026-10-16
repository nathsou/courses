import { Component, signal } from '@angular/core';
import * as i0 from "@angular/core";
export class Counter {
    count = signal(0, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "count" }] : /* istanbul ignore next */ []));
    static ɵfac = function Counter_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || Counter)(); };
    static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: Counter, selectors: [["app-counter"]], decls: 7, vars: 3, consts: [[1, "counter"], [3, "click"]], template: function Counter_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElementStart(0, "div", 0)(1, "h1");
            i0.ɵɵtext(2, "Counter");
            i0.ɵɵdomElementEnd();
            i0.ɵɵdomElementStart(3, "p");
            i0.ɵɵtext(4);
            i0.ɵɵdomElementEnd();
            i0.ɵɵdomElementStart(5, "button", 1);
            i0.ɵɵdomListener("click", function Counter_Template_button_click_5_listener() { return ctx.count.set(ctx.count() + 1); });
            i0.ɵɵtext(6, "+1");
            i0.ɵɵdomElementEnd()();
        } if (rf & 2) {
            i0.ɵɵadvance(3);
            i0.ɵɵclassProp("big", ctx.count() > 5);
            i0.ɵɵadvance();
            i0.ɵɵtextInterpolate1("Count: ", ctx.count());
        } }, encapsulation: 2 });
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(Counter, [{
        type: Component,
        args: [{
                selector: 'app-counter',
                template: `
    <div class="counter">
      <h1>Counter</h1>
      <p [class.big]="count() > 5">Count: {{ count() }}</p>
      <button (click)="count.set(count() + 1)">+1</button>
    </div>
  `,
            }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(Counter, { className: "Counter", filePath: "counter.component.ts", lineNumber: 13 }); })();
