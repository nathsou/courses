<script>
  let count = $state(0);
</script>

<div class="counter">
  <h1>Counter</h1>
  <p class={count > 5 ? 'big' : ''}>Count: {count}</p>
  <button onclick={() => count++}>+1</button>
</div>