<script lang="ts">
  import '../app.css';
  import '../../../../packages/course-navigation/navigation.css';
  import { mountSidebar, closeSidebar } from '../../../../packages/course-navigation/sidebar';
  import { onMount, type Snippet } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { lessons } from '$lib/content';
  import { preferences, initPreferences, setVideos, setTheme } from '$lib/state.svelte';
  let { children }: { children: Snippet } = $props();
  const current = $derived(lessons.find(x => page.url.pathname === `${base}/ch/${x.slug}/`));
  let settings = $state(false);
  onMount(() => {
    const stopPreferences = initPreferences();
    const stopSidebar = mountSidebar('human-evolution');
    return () => { stopPreferences(); stopSidebar(); };
  });
  afterNavigate(() => { closeSidebar(); settings = false; });
</script>

<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <button class="course-sidebar-toggle" type="button" aria-controls="course-contents" aria-expanded="true" aria-label="Hide contents" data-sidebar-toggle>
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>
  </button>
  <a class="brand" href="{base}/"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 28V14M16 19L7 10M16 14L25 5M7 10V4M16 14V5"/></svg><span>Human Evolution</span></a>
  <span class="header-label">A Collège de France course, explored</span>
  <button class="settings-toggle" onclick={() => settings = !settings} aria-expanded={settings} aria-controls="reading-settings">Reading settings <span aria-hidden="true">{settings ? '−' : '+'}</span></button>
</header>
{#if settings}
  <section class="settings" id="reading-settings" aria-label="Reading settings">
    <label class="switch"><input type="checkbox" checked={preferences.videos} onchange={e => setVideos(e.currentTarget.checked)}/> Show lecture video links and timestamps</label>
    <p>Optional French lecture references appear beside the relevant passages. Videos open only when you follow a link. Your preference is remembered on this device.</p>
    <label>Colour theme <select value={preferences.theme} onchange={e => setTheme(e.currentTarget.value)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
    <button onclick={() => { settings = false; document.querySelector<HTMLButtonElement>('.settings-toggle')?.focus(); }}>Close settings</button>
  </section>
{/if}
<div class="course-shell">
  <nav class="sidebar" id="course-contents" aria-label="Course contents">
    <div class="course-sidebar-tools">
      <a class="course-index-link" href="{base}/../" data-sveltekit-reload>← All courses</a>
      <button class="course-sidebar-toggle" type="button" aria-controls="course-contents" aria-expanded="true" aria-label="Hide contents" data-sidebar-toggle>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>
      </button>
    </div>
    <a class="sidebar-home" href="{base}/" aria-current={page.url.pathname === `${base}/` ? 'page' : undefined}>The human energy puzzle</a>
    <p class="eyebrow sidebar-eyebrow">Six lectures · Six investigations</p>
    <ol class="chapter-list">
      {#each lessons as chapter}
        <li class:here={current?.slug === chapter.slug}>
          <a href="{base}/ch/{chapter.slug}/" aria-current={current?.slug === chapter.slug ? 'page' : undefined}>
            <span class="chapter-number">{String(chapter.number).padStart(2, '0')}</span><span>{chapter.title}<small>{chapter.subtitle}</small></span>
            {#if preferences.reviewed.includes(chapter.slug)}<span class="review-tick" aria-label="Self-reviewed">✓</span>{/if}
          </a>
          {#if current?.slug === chapter.slug}
            <ul class="section-list">{#each chapter.headings as heading}<li><a href="#{heading.id}">{heading.text}</a></li>{/each}</ul>
          {/if}
        </li>
      {/each}
    </ol>
    <a class="resource-link" href="{base}/resources/" aria-current={page.url.pathname === `${base}/resources/` ? 'page' : undefined}>Sources & field glossary <span aria-hidden="true">↗</span></a>
    <div class="sidebar-footer"><p>Jean-Jacques Hublin<br/>Collège de France · 2017</p><p>English adaptation with scientific updates. Guest talks are optional.</p></div>
  </nav>
  <main id="main" tabindex="-1">{@render children()}</main>
</div>
<footer class="site-footer"><span>Human Evolution</span><span>Energy, childhood, and the environments we make</span><a href="{base}/resources/">Attribution & sources</a></footer>
