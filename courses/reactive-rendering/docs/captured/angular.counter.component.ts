import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <div class="counter">
      <h1>Counter</h1>
      <p [class.big]="count() > 5">Count: {{ count() }}</p>
      <button (click)="count.set(count() + 1)">+1</button>
    </div>
  `,
})
export class Counter {
  count = signal(0);
}
