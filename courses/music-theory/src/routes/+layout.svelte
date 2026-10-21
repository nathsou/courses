<script lang="ts">
  import '../app.css';
  import '../../../../packages/course-navigation/navigation.css';
  import { mountSidebar, closeSidebar } from '../../../../packages/course-navigation/sidebar';
  import { onMount, type Snippet } from 'svelte';
  import { theme } from '$lib/state/theme.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { nav } from '$lib/state/nav.svelte';
  import { COURSE_SUBTITLE, COURSE_TITLE } from '$content/outline';
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import { afterNavigate } from '$app/navigation';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    theme.init();
    settings.load();
    const stopKeys = instrument.mountKeys();
    // Reconnect MIDI without a prompt when the reader has already allowed it.
    navigator.permissions
      ?.query({ name: 'midi' as PermissionName })
      .then((p) => {
        if (p.state === 'granted') void instrument.connect();
      })
      .catch(() => {});
    const stopSidebar = mountSidebar('music-theory', state => (nav.sidebarOpen = state.open));
    return () => {
      stopKeys();
      stopSidebar();
    };
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
  <p>{COURSE_TITLE} · {COURSE_SUBTITLE}</p>
  <p class="credits">Piano: Salamander Grand Piano by Alexander Holm (CC BY 3.0). Music font: Bravura by Steinberg (SIL OFL).</p>
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
  .foot p {
    margin: 0;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .foot .credits {
    letter-spacing: 0.02em;
    text-transform: none;
  }
</style>
