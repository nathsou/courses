<script lang="ts">
  import { base } from '$app/paths';
  import { COURSE_TITLE } from '$content/outline';
  import { theme } from '$lib/state/theme.svelte';
  import { nav } from '$lib/state/nav.svelte';
  import Icon from '../ui/Icon.svelte';

  let scrolled = $state(false);
</script>

<svelte:window onscroll={() => (scrolled = scrollY > 160)} />

<header class="topbar ui" class:scrolled>
  <button class="course-sidebar-toggle" type="button" aria-controls="course-contents" aria-expanded="true" aria-label="Hide contents" title="Hide contents" data-sidebar-toggle>
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>
  </button>
  <a class="brand" href="{base}/">
    <svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path class="teeth" d="M10.6 1.5h2.8l.4 2.4 1.9.8 2-1.4 2 2-1.4 2 .8 1.9 2.4.4v2.8l-2.4.4-.8 1.9 1.4 2-2 2-2-1.4-1.9.8-.4 2.4h-2.8l-.4-2.4-1.9-.8-2 1.4-2-2 1.4-2-.8-1.9-2.4-.4v-2.8l2.4-.4.8-1.9-1.4-2 2-2 2 1.4 1.9-.8z" /><circle class="hub" cx="12" cy="12" r="2.6" /></svg>
    <span class="name">{COURSE_TITLE}</span>
  </a>
  <span class="page-title" aria-hidden={!scrolled}>{nav.pageTitle ?? ''}</span>
  <span class="spacer"></span>
  <button class="icon-btn" onclick={() => theme.set(theme.resolved === 'dark' ? 'light' : 'dark')} aria-label="Switch to {theme.resolved === 'dark' ? 'light' : 'dark'} theme">
    <Icon name={theme.resolved === 'dark' ? 'sun' : 'moon'} />
  </button>
</header>

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
  .mark {
    width: 1.5rem;
    height: 1.5rem;
    flex: none;
  }
  .mark .teeth {
    fill: none;
    stroke: var(--ac);
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .mark .hub {
    fill: var(--ac);
  }
  .brand:hover .mark {
    transform: rotate(22.5deg);
    transition: transform 400ms;
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
  }
  @media (max-width: 420px) {
    .brand .name {
      display: none;
    }
  }
</style>
