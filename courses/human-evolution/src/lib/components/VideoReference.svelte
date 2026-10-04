<script lang="ts">
  import { preferences } from '$lib/state.svelte';
  import type { Chapter } from '$lib/outline';
  let { chapter, start, end, label }: { chapter: Chapter; start: number; end: number; label: string } = $props();
  const time = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
</script>
{#if preferences.videos}
  <aside class="video-reference" aria-label="Original lecture reference">
    <span class="eyebrow">Original lecture · French · {chapter.date}</span>
    <p><span lang="fr">{chapter.original}</span> · {label}</p>
    <a href="https://www.youtube.com/watch?v={chapter.videoId}&t={start}s" target="_blank" rel="noreferrer">Open on YouTube at {time(start)} →</a>
    <small>Topic interval {time(start)}–{time(end)}. The link starts playback; it does not stop it. Later corrections are cited in the text.</small>
  </aside>
{/if}
