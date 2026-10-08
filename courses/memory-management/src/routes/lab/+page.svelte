<script lang="ts">
  import { base } from '$app/paths';
  import { COURSE_TITLE } from '$content/outline';
  import LabBench from '$lib/components/heap/LabBench.svelte';
</script>

<svelte:head><title>The lab bench — {COURSE_TITLE}</title></svelte:head>

<article class="article lab">
  <p class="kicker ui">The malloc lab</p>
  <h1>The lab bench</h1>
  <p class="lede">Write an allocator, run it against every trace in the course, and see where it lands among the reference designs. Your draft is kept in this browser; when every trace passes, you can make it the allocator the course’s figures run.</p>
  <p class="ui hint">New here? <a href="{base}/chapters/the-malloc-lab">Chapter 14</a> explains the rules, the traces and the score, and suggests where to start.</p>
  <LabBench n="Lab" full />
</article>

<style>
  .kicker {
    font-size: 0.74rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--copper);
    margin: 0 0 0.3rem;
  }
  .lede {
    font-size: 1.08rem;
  }
  .hint {
    font-size: 0.86rem;
    color: var(--ink-2);
  }
</style>
