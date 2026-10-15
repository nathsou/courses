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
    return mountSidebar('primes', state => (nav.sidebarOpen = state.open));
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
  <svg class="bars" viewBox="0 0 80 14" aria-hidden="true"><path d="M0 13h6v-2h6v-2h8v-2h6v-2h10v-2h12v-2h32" /></svg>
  <p>{COURSE_TITLE} · {COURSE_SUBTITLE}</p>
</footer>

<style>
  .skip {
    position: absolute;
    left: -999px;
    top: 0.5rem;
    z-index: 100;
    background: var(--fx-yellow);
    color: var(--fx-ink);
    font-weight: 700;
    border: 2px solid var(--fx-ink);
    padding: 0.4rem 0.8rem;
  }
  .skip:focus {
    left: 0.5rem;
  }
  .shell {
    display: grid;
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
    min-height: calc(100vh - 3.25rem);
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
    border-top: 1px solid var(--line-strong);
    padding: 1.5rem max(1rem, calc((100% - 72rem) / 2 + 1rem)) 2rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.9rem 1.5rem;
  }
  .bars {
    width: 5rem;
    height: 0.9rem;
    flex: none;
    fill: none;
    stroke: var(--ac);
    stroke-width: 1.6;
  }
  .foot p {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--mute);
  }
</style>
