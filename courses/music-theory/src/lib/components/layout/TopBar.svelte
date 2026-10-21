<script lang="ts">
  import { base } from '$app/paths';
  import { COURSE_TITLE } from '$content/outline';
  import { theme } from '$lib/state/theme.svelte';
  import { nav } from '$lib/state/nav.svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import InstrumentSetup from '$lib/widgets/InstrumentSetup.svelte';
  import Icon from '../ui/Icon.svelte';

  let scrolled = $state(false);
  let open = $state(false);
  let panel: HTMLDivElement | undefined = $state();
  let button: HTMLButtonElement | undefined = $state();

  const chip = $derived(
    instrument.status === 'ready' ? (instrument.inputs.length === 1 ? instrument.inputs[0]!.name : `${instrument.inputs.length} MIDI inputs`) : instrument.status === 'unsupported' ? 'No MIDI here' : 'Connect keyboard',
  );
  const NAMES = { letters: 'C D E', solfege: 'Do Ré Mi', german: 'C D E … H' } as const;

  function onDocClick(e: MouseEvent) {
    if (open && panel && !panel.contains(e.target as Node) && !button?.contains(e.target as Node)) open = false;
  }
  function onKey(e: KeyboardEvent) {
    if (open && e.key === 'Escape') {
      open = false;
      button?.focus();
    }
  }
</script>

<svelte:document onclick={onDocClick} onkeydown={onKey} />

<svelte:window onscroll={() => (scrolled = scrollY > 160)} />

<header class="topbar ui" class:scrolled>
  <button class="course-sidebar-toggle" type="button" aria-controls="course-contents" aria-expanded="true" aria-label="Hide contents" title="Hide contents" data-sidebar-toggle>
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>
  </button>
  <a class="brand" href="{base}/">
    <svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path class="rule" d="M1 6h22M1 9.5h22M1 13h22M1 16.5h22M1 20h22" /><ellipse class="head" cx="9" cy="16.6" rx="3.1" ry="2.2" transform="rotate(-20 9 16.6)" /><path class="stem" d="M11.9 15.6V3" /></svg>
    <span class="name">{COURSE_TITLE}</span>
  </a>
  <span class="page-title" aria-hidden={!scrolled}>{nav.pageTitle ?? ''}</span>
  <span class="spacer"></span>
  <div class="instrument">
    <button bind:this={button} class="chip" class:ready={instrument.status === 'ready'} aria-expanded={open} aria-controls="instrument-panel" onclick={() => (open = !open)}>
      <Icon name="piano" size={16} />
      <span class="chip-text">{chip}</span>
    </button>
    {#if open}
      <div id="instrument-panel" class="panel" bind:this={panel} role="dialog" aria-label="Instrument and notation">
        <InstrumentSetup compact />
      </div>
    {/if}
  </div>
  <button class="icon-btn" onclick={() => theme.set(theme.resolved === 'dark' ? 'light' : 'dark')} aria-label="Switch to {theme.resolved === 'dark' ? 'light' : 'dark'} theme">
    <Icon name={theme.resolved === 'dark' ? 'sun' : 'moon'} />
  </button>
</header>
{#if settings.derivedFrom && !settings.chosen && settings.noteNames !== 'letters'}
  <p class="locale-note ui">
    Note names: {NAMES[settings.noteNames]}, from your browser’s language ({settings.derivedFrom}).
    <button onclick={() => (open = true)}>Change</button>
    <button onclick={() => settings.setNames(settings.noteNames)} aria-label="Keep these note names">Keep</button>
  </p>
{/if}

<style>
  .topbar {
    position: sticky;
    top: 0px;
    z-index: 40;
    height: 3.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 1rem;
    background: var(--bg);
    border-bottom: 1px solid var(--line-strong);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    color: var(--ink);
    text-decoration: none;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.08rem;
    letter-spacing: -0.01em;
  }
  .brand:hover {
    opacity: 1;
    color: var(--accent);
  }
  /* A small prime staircase. */
  .mark {
    width: 1.5rem;
    height: 1.5rem;
    flex: none;
    fill: none;
    stroke-linecap: square;
  }
  .mark .rule {
    stroke: var(--line-strong);
    stroke-width: 1.5;
  }
  .mark .rule {
    stroke-width: 1;
  }
  .mark .head {
    fill: var(--ac);
  }
  .mark .stem {
    stroke: var(--ac);
    stroke-width: 1.6;
  }
  .instrument {
    position: relative;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    max-width: 16rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink-2);
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }
  .chip.ready {
    color: var(--ok);
    border-color: var(--ok);
  }
  .chip-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .panel {
    position: absolute;
    right: 0;
    top: calc(100% + 0.5rem);
    width: min(22rem, calc(100vw - 2rem));
    max-height: calc(100vh - 5rem);
    overflow-y: auto;
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 0.9rem 1rem 1.1rem;
    z-index: 60;
  }
  .locale-note {
    margin: 0;
    padding: 0.4rem 1rem;
    font-size: 0.84rem;
    color: var(--ink-2);
    background: var(--accent-soft);
    border-bottom: 1px solid var(--line);
  }
  .locale-note button {
    border: 0;
    background: none;
    color: var(--accent);
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
    padding: 0 0.3rem;
  }
  .page-title {
    font-size: 0.86rem;
    font-weight: 500;
    color: var(--ink-2);
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 180ms, transform 180ms;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .page-title::before {
    content: '/';
    margin-right: 0.6rem;
    color: var(--ink-3);
  }
  .scrolled .page-title {
    opacity: 1;
    transform: none;
  }
  .spacer {
    flex: 1;
  }
  .icon-btn {
    display: inline-flex;
    border: 2px solid transparent;
    background: none;
    padding: 0.35rem;
    border-radius: var(--radius);
    color: var(--ink);
    cursor: pointer;
  }
  .icon-btn:hover {
    border-color: var(--fg);
    background: var(--pn);
  }
  @media (max-width: 640px) {
    .page-title {
      display: none;
    }
    .chip-text {
      max-width: 6.5rem;
    }
  }
  @media (max-width: 420px) {
    .brand .name {
      display: none;
    }
  }
</style>
