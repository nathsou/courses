<script lang="ts">
  /** Dispatches a fenced exercise block to its component inside the shared frame. */
  import type { Component } from 'svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import Choose from './Choose.svelte';
  import Fill from './Fill.svelte';
  import Type from './Type.svelte';
  import Cloze from './Cloze.svelte';
  import Gender from './Gender.svelte';
  import Conjugate from './Conjugate.svelte';
  import Order from './Order.svelte';
  import Match from './Match.svelte';
  import Sort from './Sort.svelte';
  import Scene from './Scene.svelte';
  import Story from './Story.svelte';
  import Read from './Read.svelte';
  import Speak from './Speak.svelte';
  import Roleplay from './Roleplay.svelte';
  import Compose from './Compose.svelte';

  let { kind, id, data }: { kind: string; id: string; data: any } = $props();

  const KINDS: Record<string, [Component<any>, string, string]> = {
    choose: [Choose, 'Quick check', 'sparkle'],
    fill: [Fill, 'Fill the gap', 'sparkle'],
    type: [Type, 'Type it', 'keyboard'],
    cloze: [Cloze, 'Fill the gaps', 'keyboard'],
    gender: [Gender, 'Der, die, das?', 'cards'],
    conjugate: [Conjugate, 'Conjugate', 'keyboard'],
    order: [Order, 'Sentence builder', 'shuffle'],
    match: [Match, 'Match up', 'cards'],
    sort: [Sort, 'Sort it out', 'cards'],
    scene: [Scene, 'Scene', 'chat'],
    story: [Story, 'Story', 'book'],
    read: [Read, 'Reading', 'book'],
    speak: [Speak, 'Say it', 'mic'],
    roleplay: [Roleplay, 'Conversation partner', 'chat'],
    compose: [Compose, 'Your own sentence', 'brush'],
  };
  const entry = $derived(KINDS[kind]);
</script>

{#if entry}
  {@const [C, label, icon] = entry}
  <ExerciseFrame {id} {label} {icon} title={data.title ?? null} optional={kind === 'roleplay' || kind === 'compose'}>
    {#snippet body(report)}
      <C {data} {id} {report} />
    {/snippet}
  </ExerciseFrame>
{:else}
  <p class="error">Unknown exercise “{kind}”.</p>
{/if}
