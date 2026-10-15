<script lang="ts">
  import '../app.css';
  import '../../../../packages/course-navigation/navigation.css';
  import { mountSidebar, closeSidebar } from '../../../../packages/course-navigation/sidebar';
  import { onMount, type Snippet } from 'svelte';
  import { theme } from '$lib/state/theme.svelte';
  import { nav } from '$lib/state/nav.svelte';
  import { COURSE_SUBTITLE, COURSE_TITLE } from '$content/outline';
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import { afterNavigate } from '$app/navigation';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    theme.init();
    return mountSidebar('reactive-rendering', state => (nav.sidebarOpen = state.open));
  });
  afterNavigate(closeSidebar);
</script>

<a class="skip ui" href="#main">Skip to content</a>
<TopBar />
<div class="shell course-shell">
  <Sidebar />
  <main id="main">
    {@render children()}
  </main>
</div>
<footer class="foot ui">
  <svg class="trace" viewBox="0 0 120 12" aria-hidden="true">
    <rect x="1" y="1" width="24" height="10" rx="3" /><rect x="48" y="1" width="24" height="10" rx="3" class="on" /><rect x="95" y="1" width="24" height="10" rx="3" />
  </svg>
  <p class="t">{COURSE_TITLE}</p>
  <p class="s">{COURSE_SUBTITLE}</p>
</footer>

<style>
  .skip {
    position: absolute;
    left: -999px;
    top: 0.5rem;
    z-index: 100;
    background: var(--fg);
    color: var(--bg);
    font-weight: 600;
    border-radius: 6px;
    padding: 0.45rem 0.9rem;
    text-decoration: none;
  }
  .skip:focus {
    left: 0.5rem;
  }
  .shell {
    display: grid;
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
    min-height: calc(100vh - 3.5rem);
  }
  main {
    min-width: 0;
  }
  @media (max-width: 1099px) {
    .shell {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .foot {
    border-top: 1px solid var(--line);
    background: color-mix(in srgb, var(--pn) 55%, transparent);
    padding: 1.6rem max(1rem, calc((100% - 72rem) / 2 + 1rem)) 2.2rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 1rem;
  }
  .trace {
    width: 5.5rem;
    height: 0.8rem;
    flex: none;
  }
  .trace rect {
    fill: none;
    stroke: var(--node-line);
    stroke-width: 1.4;
  }
  .trace rect.on {
    stroke: var(--flash);
    fill: var(--flash-soft);
  }
  .foot p {
    margin: 0;
  }
  .t {
    font-weight: 600;
    font-size: 0.92rem;
  }
  .s {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    color: var(--mute);
  }
</style>
