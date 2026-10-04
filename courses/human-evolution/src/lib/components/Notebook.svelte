<script lang="ts">
  import { onMount } from 'svelte';
  import { preferences, read, save, review } from '$lib/state.svelte';
  let { slug, prompt }: { slug: string; prompt: string } = $props();
  let text = $state('');
  let status = $state('');
  onMount(() => { const draft = read<unknown>(`note:${slug}`, ''); text = typeof draft === 'string' ? draft : ''; });
  function edit(value: string) {
    text = value;
    status = save(`note:${slug}`, text) ? 'Draft saved on this device.' : 'Storage is unavailable. Copy your note before leaving.';
    if (preferences.reviewed.includes(slug)) review(slug, false);
  }
  function download() {
    const url = URL.createObjectURL(new Blob([`${prompt}\n\n${text}\n`], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `human-evolution-${slug}.txt`; a.click(); URL.revokeObjectURL(url);
  }
</script>
<section class="notebook" aria-labelledby="note-{slug}">
  <span class="eyebrow">Your field note · Optional</span>
  <label id="note-{slug}" for="draft-{slug}">{prompt}</label>
  <textarea id="draft-{slug}" rows="4" value={text} oninput={e => edit(e.currentTarget.value)} placeholder="An observation, an explanation, and what you would still need to know…"></textarea>
  <div class="note-tools"><label><input type="checkbox" checked={preferences.reviewed.includes(slug)} onchange={e => review(slug, e.currentTarget.checked)}/> I have reviewed my explanation</label><button onclick={download}>Download note</button></div>
  <p class="small" aria-live="polite">{status || 'Notes stay on this device. Self-review is your judgment; free-text notes are not automatically checked.'}</p>
</section>
