<!--
  A static, highlighted code listing for the figures: the same token colours as the editor, rendered at build time.
-->
<script lang="ts">
  import { highlightLines, styleOf, type CodeLang } from './highlight';

  let { code, lang = 'ts', class: klass = '', label }: { code: string; lang?: CodeLang; class?: string; label?: string } = $props();
  const lines = $derived(highlightLines(code, lang));
</script>

<pre class="code-listing {klass}" aria-label={label}><code>{#each lines as line, i (i)}{#each line as tok, j (j)}{#if tok.rule}<span style:color={styleOf.get(tok.rule)?.color} style:font-style={styleOf.get(tok.rule)?.italic ? 'italic' : undefined}>{tok.text}</span>{:else}{tok.text}{/if}{/each}{#if i < lines.length - 1}{'\n'}{/if}{/each}</code></pre>
