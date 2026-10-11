<script lang="ts">
  /** The help dial: gender colours and instant translations, switchable from anywhere. */
  import { settings } from '$lib/state/settings.svelte';
</script>

<div class="dial ui" role="group" aria-label="Help">
  <button aria-pressed={settings.data.genders} title="Colour nouns by gender: der blue, die red, das green" onclick={() => settings.set('genders', !settings.data.genders)}>
    <span class="g"><i class="m"></i><i class="f"></i><i class="n"></i></span><span class="lbl">Gender</span>
  </button>
  <button aria-pressed={settings.data.translations} title="Show English translations straight away" onclick={() => settings.set('translations', !settings.data.translations)}>
    EN
  </button>
</div>

<style>
  .dial {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--panel);
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: none;
    background: none;
    border-radius: 999px;
    padding: 0.2rem 0.55rem;
    font-size: 0.75rem;
    font-weight: 650;
    color: var(--mute);
    cursor: pointer;
    min-height: 1.7rem;
  }
  button[aria-pressed='true'] {
    background: var(--pn);
    color: var(--fg);
  }
  .g {
    display: inline-flex;
    gap: 2px;
  }
  .g i {
    width: 0.42rem;
    height: 0.42rem;
    border-radius: 50%;
    background: var(--line-strong);
  }
  [aria-pressed='true'] .m { background: var(--g-m); }
  [aria-pressed='true'] .f { background: var(--g-f); }
  [aria-pressed='true'] .n { background: var(--g-n); }
  @media (max-width: 520px) {
    .lbl {
      display: none;
    }
    button {
      padding: 0.2rem 0.4rem;
    }
  }
</style>
