---
title: One counter, nine frameworks
summary: The same component written in React, Preact Signals, Solid, Vue, Svelte 5, Angular, Lit, Qwik and htmx, with the versions the course used.
number: D
---

The same component, nine times. It shows a count, its double, adds a class once the count passes five, sets the page title from an effect, and has a button. The listings are the idiomatic way to write it in each library as of October 2026; they are not run by the course (the compiled outputs in chapter 19 are real, from the versions named there). Differences in how each one says *state*, *derived value*, *effect*, *read* and *write* are the subject of the table at the end of chapter 15.

| | State | Derived | Effect | Read | Write |
|---|---|---|---|---|---|
| React 19 | `useState` | an expression | `useEffect` | `count` | `setCount` |
| Preact Signals 1.14 | `signal` | `computed` | `effect` | `count.value` | `count.value = …` |
| Solid 1.9 | `createSignal` | `createMemo` | `createEffect` | `count()` | `setCount(…)` |
| Vue 3.5 | `ref` | `computed` | `watchEffect` | `count.value` (`count` in templates) | `count.value = …` |
| Svelte 5.5 | `$state` | `$derived` | `$effect` | `count` | `count = …` |
| Angular 22 | `signal` | `computed` | `effect` | `count()` | `count.set(…)` |
| Lit 3.3 | `@state()` | an expression | `updated()` | `this.count` | `this.count = …` |
| Qwik 1.20 | `useSignal` | `useComputed$` | `useVisibleTask$` | `count.value` | `count.value = …` |
| htmx 2 | the server | the server | none | the HTML | a request |

## React 19

```jsx
import { useState, useEffect } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  const double = count * 2;
  useEffect(() => {
    document.title = `count is ${count}`;
  }, [count]);
  return (
    <div className="counter">
      <p className={count > 5 ? 'big' : ''}>{count} × 2 = {double}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

The function runs again on every change. With the React Compiler, the memoization of `double` and of each element is written for you (chapter 19).

## Preact Signals 1.14

```jsx
import { signal, computed, effect } from '@preact/signals';

const count = signal(0);
const double = computed(() => count.value * 2);
effect(() => {
  document.title = `count is ${count.value}`;
});

export function Counter() {
  return (
    <div class="counter">
      <p class={count.value > 5 ? 'big' : ''}>{count} × 2 = {double}</p>
      <button onClick={() => count.value++}>+1</button>
    </div>
  );
}
```

Passing the signal itself (`{count}`, not `{count.value}`) lets Preact bind the text node directly to the signal, so a change writes one text node and does not re-render the component.

## Solid 1.9

```jsx
import { createSignal, createMemo, createEffect } from 'solid-js';

export function Counter() {
  const [count, setCount] = createSignal(0);
  const double = createMemo(() => count() * 2);
  createEffect(() => {
    document.title = `count is ${count()}`;
  });
  return (
    <div class="counter">
      <p class={count() > 5 ? 'big' : ''}>{count()} × 2 = {double()}</p>
      <button onClick={() => setCount(count() + 1)}>+1</button>
    </div>
  );
}
```

The function body runs once. The expressions in braces are the holes, each wrapped in an effect (chapter 12).

## Vue 3.5

```vue
<script setup>
import { ref, computed, watchEffect } from 'vue';

const count = ref(0);
const double = computed(() => count.value * 2);
watchEffect(() => {
  document.title = `count is ${count.value}`;
});
</script>

<template>
  <div class="counter">
    <p :class="count > 5 ? 'big' : ''">{{ count }} × 2 = {{ double }}</p>
    <button @click="count++">+1</button>
  </div>
</template>
```

In the template, refs are unwrapped for you: `count` reads and `count++` writes `count.value`. Add `vapor` to the `<script setup>` tag in the 3.6 release candidates to compile it without a virtual DOM.

## Svelte 5

```svelte
<script>
  let count = $state(0);
  let double = $derived(count * 2);

  $effect(() => {
    document.title = `count is ${count}`;
  });
</script>

<div class="counter">
  <p class={count > 5 ? 'big' : ''}>{count} × 2 = {double}</p>
  <button onclick={() => count++}>+1</button>
</div>
```

The runes are compile-time markers. The compiler rewrites each read and write into a signal call (chapter 18).

## Angular 22

```ts
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <div class="counter">
      <p [class.big]="count() > 5">{{ count() }} × 2 = {{ double() }}</p>
      <button (click)="count.set(count() + 1)">+1</button>
    </div>
  `,
})
export class Counter {
  count = signal(0);
  double = computed(() => this.count() * 2);

  constructor() {
    effect(() => {
      document.title = `count is ${this.count()}`;
    });
  }
}
```

The template’s bindings are evaluated when its view is checked; a signal read in the template notifies the view (chapter 14).

## Lit 3.3

```ts
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('x-counter')
export class Counter extends LitElement {
  @state() count = 0;

  updated() {
    document.title = `count is ${this.count}`;
  }

  render() {
    return html`
      <div class="counter">
        <p class=${this.count > 5 ? 'big' : ''}>${this.count} × 2 = ${this.count * 2}</p>
        <button @click=${() => this.count++}>+1</button>
      </div>
    `;
  }
}
```

Setting `count` requests an update in a microtask; `render()` runs again, and each hole compares its new value with the last (chapter 16).

## Qwik 1.20

```tsx
import { component$, useSignal, useComputed$, useVisibleTask$ } from '@builder.io/qwik';

export default component$(() => {
  const count = useSignal(0);
  const double = useComputed$(() => count.value * 2);

  useVisibleTask$(({ track }) => {
    track(() => count.value);
    document.title = `count is ${count.value}`;
  });

  return (
    <div class="counter">
      <p class={count.value > 5 ? 'big' : ''}>{count.value} × 2 = {double.value}</p>
      <button onClick$={() => count.value++}>+1</button>
    </div>
  );
});
```

Each `$` marks a closure that the optimizer extracts into its own lazy chunk (chapter 22). `useVisibleTask$` runs only in the browser.

## htmx 2

```html
<div class="counter" hx-target="this" hx-swap="outerHTML">
  <p class="">3 × 2 = 6</p>
  <button hx-post="/counter/increment">+1</button>
</div>
```

There is no client-side state. The click posts to the server, which keeps the count, renders the component again, and replies with the new HTML; htmx puts it on the page (with `hx-swap="morph"` and the Idiomorph extension, by morphing it; chapter 23). The title is set by the server in the response head or with a small script.
