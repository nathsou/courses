<!--
  Development lab for the Weft widgets (not linked from the course): the playground with the counter, the
  traffic light and the ALU, and a small module written inline.
-->
<script lang="ts">
  import WeftPlayground from '$lib/widgets/weft/WeftPlayground.svelte';

  const half = 'module half_adder(in a: bool, in b: bool, out sum: bool, out carry: bool) {\n    sum = a ^ b;\n    carry = a && b;\n}\n';
</script>

<article class="lab">
  <h1>Weft lab</h1>
  <p class="lede">The Weft widgets, for design review. Not linked from the course.</p>

  <h2>Playground</h2>
  <WeftPlayground src="designs/counter.weft" n="29.1" />
  <WeftPlayground src="designs/traffic-light.weft" n="29.2" />
  <WeftPlayground code={half} title="A half adder" n="29.3" />
  <WeftPlayground src="designs/alu.weft" n="29.4" circuit={false} />
</article>

<style>
  .lab {
    max-width: 72rem;
    margin: 0 auto;
    padding: 1.5rem max(1rem, 3vw) 4rem;
  }
  h1 {
    font-family: var(--font-display);
  }
  .lede {
    color: var(--ink-2);
  }
</style>
