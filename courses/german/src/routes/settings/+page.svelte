<script lang="ts">
  import { base } from '$app/paths';
  import { settings } from '$lib/state/settings.svelte';
  import { PROVIDERS, isProvider, withoutTutorKeys, restoreTutorSettings } from '$lib/tutor/providers';
  import { progress } from '$lib/state/progress.svelte';
  import { deck } from '$lib/srs/deck.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import De from '$lib/components/de/De.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let keyDraft = $state('');
  let keySaved = $state(false);
  let importMsg = $state('');
  const providerInfo = $derived(PROVIDERS[settings.data.provider]);
  let hasClips = $state<boolean | null>(null);
  $effect(() => {
    keyDraft = settings.tutorConfig.apiKey;
    void speech.has('Guten Tag!').then((h) => (hasClips = h));
  });


  function saveKey() {
    settings.setTutor(settings.data.provider, { apiKey: keyDraft.trim() });
    keySaved = true;
    setTimeout(() => (keySaved = false), 2000);
  }

  function exportData() {
    const data = {
      app: 'auf-deutsch',
      version: 2,
      exported: new Date().toISOString(),
      progress: progress.data,
      deck: deck.data,
      settings: { ...settings.data, ...withoutTutorKeys(settings.data) },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `german-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'auf-deutsch') throw new Error('not a backup from this course');
      if (!confirm('Replace your current progress and review deck with this backup?')) return;
      progress.replace(data.progress);
      deck.replace(data.deck);
      const { apiKey: _ignored, model: _oldModel, tutors: _ignoredProfiles, provider: _ignoredProvider, ...rest } = data.settings ?? {};
      settings.update({ ...rest, ...restoreTutorSettings(data.settings, settings.data) });
      importMsg = 'Backup restored.';
    } catch (err) {
      importMsg = `Could not read that file: ${(err as Error).message}`;
    }
  }

  function reset() {
    if (!confirm('Delete all your progress, your review deck and your settings in this browser? This cannot be undone.')) return;
    for (const k of ['german:progress', 'german:deck', 'german:settings', 'german:placement']) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
    location.reload();
  }
</script>

<svelte:head><title>Settings · Auf Deutsch</title></svelte:head>

<div class="page">
  <h1>Settings</h1>
  <p class="ui lead">Everything is stored in this browser only. Use a backup to move your progress to another device.</p>

  <section class="card">
    <h2>Help while reading</h2>
    <p class="ui note">As you improve, show less. Both switches are also in the top bar.</p>
    <label class="row ui"><input type="checkbox" checked={settings.data.genders} onchange={(e) => settings.set('genders', e.currentTarget.checked)} /> Colour nouns by gender: <span class="g-m c">der</span> <span class="g-f c">die</span> <span class="g-n c">das</span> <span class="g-pl c">plural only</span></label>
    <p class="sample">Preview: <De text="Die Katze schläft auf dem Sofa, und der Hund spielt mit dem Kind." size="md" /></p>
    <label class="row ui"><input type="checkbox" checked={settings.data.translations} onchange={(e) => settings.set('translations', e.currentTarget.checked)} /> Show English translations in dialogues straight away</label>
  </section>

  <section class="card">
    <h2>Audio</h2>
    <label class="row ui">Speech speed
      <input type="range" min="0.6" max="1.2" step="0.05" value={settings.data.rate} oninput={(e) => settings.set('rate', Number(e.currentTarget.value))} />
      <span class="val">{Math.round(settings.data.rate * 100)}%</span>
      <button class="btn small" onclick={() => speech.say('Guten Tag! Schön, Sie kennenzulernen.')}><Icon name="play" size={13} />Test</button>
    </label>
    <label class="row ui"><input type="checkbox" checked={settings.data.sounds} onchange={(e) => settings.set('sounds', e.currentTarget.checked)} /> Sound effects for right and wrong answers</label>
    <p class="ui note">
      {#if hasClips === false}This copy of the course has no recorded clips yet, so it uses your browser's built-in German voice. Voices vary between devices; if you hear nothing, your system may need a German voice installed.{:else if hasClips}Audio comes from recorded clips, with your browser's German voice as a fallback for anything generated on the fly (like numbers and times).{/if}
      {#if speech.voiceMissing} <strong>No German voice was found on this device.</strong>{/if}
    </p>
  </section>

  <section class="card">
    <h2>Review deck</h2>
    <label class="row ui">New cards per day
      <input type="number" min="0" max="100" value={settings.data.newPerDay} onchange={(e) => settings.set('newPerDay', Math.min(100, Math.max(0, Number(e.currentTarget.value) || 0)))} />
    </label>
    <label class="row ui"><input type="checkbox" checked={settings.data.typeAnswers} onchange={(e) => settings.set('typeAnswers', e.currentTarget.checked)} /> Type the German on “write it” cards (checked automatically)</label>
    <label class="row ui"><input type="checkbox" checked={settings.data.lenientSpelling} onchange={(e) => settings.set('lenientSpelling', e.currentTarget.checked)} /> Accept ae, oe, ue and ss for ä, ö, ü and ß without comment</label>
    <p class="ui note">On a keyboard without umlauts, the ä ö ü ß buttons under every answer field insert them. Capital letters always matter in German: a noun typed in lower case counts as “almost”.</p>
  </section>

  <section class="card" id="tutor">
    <h2>AI conversation partner <span class="opt-tag ui">Optional</span></h2>
    <p class="ui note">The teacher chat, role-plays and sentence feedback use your chosen provider. Keys stay in this browser; messages and lesson context go directly to {providerInfo.host}. Usage is billed to your {providerInfo.name} account. Everything else works without AI.</p>
    <label class="row ui">Provider
      <select aria-label="Provider" value={settings.data.provider} onchange={(e) => { if (isProvider(e.currentTarget.value)) settings.set('provider', e.currentTarget.value); }}>
        {#each Object.entries(PROVIDERS) as [id, info] (id)}<option value={id}>{info.name}</option>{/each}
      </select>
    </label>
    <label class="row ui">{providerInfo.name} API key
      <input type="password" aria-label="{providerInfo.name} API key" bind:value={keyDraft} placeholder={providerInfo.placeholder} autocomplete="off" spellcheck="false" />
      <button class="btn small" onclick={saveKey}>{keySaved ? 'Saved' : 'Save'}</button>
    </label>
    <label class="row ui">Model
      <input type="text" value={settings.tutorConfig.model} onchange={(e) => settings.setTutor(settings.data.provider, { model: e.currentTarget.value.trim() || providerInfo.model })} />
    </label>
    {#if settings.tutorEnabled}<button class="btn small ghost" onclick={() => ((keyDraft = ''), settings.setTutor(settings.data.provider, { apiKey: '' }))}>Remove key</button>{/if}
  </section>

  <section class="card">
    <h2>Backup and reset</h2>
    <div class="row ui wrap">
      <button class="btn" onclick={exportData}>Download a backup</button>
      <label class="btn">Restore from a backup <input type="file" accept="application/json" class="sr-only" onchange={importData} /></label>
      <button class="btn ghost danger" onclick={reset}>Reset everything</button>
    </div>
    {#if importMsg}<p class="ui note">{importMsg}</p>{/if}
    <p class="ui note">Starting point: {settings.data.start ?? 'not chosen'}. <a href="{base}/placement/">Take the placement check</a></p>
  </section>
</div>

<style>
  .page {
    padding: 2.2rem clamp(1rem, 4vw, 3.5rem) 4rem;
    max-width: 46rem;
  }
  h1 {
    margin: 0 0 0.3rem;
  }
  .lead {
    color: var(--ink-2);
    margin: 0 0 1.2rem;
  }
  section {
    padding: 1rem 1.3rem 1.2rem;
    margin-bottom: 1rem;
  }
  h2 {
    font-size: 1.2rem;
    margin: 0 0 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .note {
    font-size: 0.85rem;
    color: var(--ink-2);
    margin: 0.4rem 0;
  }
  .sample {
    margin: 0.4rem 0 0.8rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin: 0.55rem 0;
    font-size: 0.92rem;
  }
  .row input[type='number'],
  .row input[type='password'],
  .row input[type='text'],
  select {
    max-width: 100%;
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    font-size: 0.92rem;
  }
  .row input[type='password'],
  .row input[type='text'] {
    flex: 1;
    min-width: min(12rem, 100%);
    max-width: 100%;
  }
  .row input[type='number'] {
    width: 5rem;
  }
  .val {
    font-variant-numeric: tabular-nums;
    min-width: 3rem;
  }
  .c {
    color: var(--tone);
    font-weight: 700;
  }
  .wrap {
    gap: 0.5rem;
  }
  .danger {
    color: var(--bad);
  }
</style>
