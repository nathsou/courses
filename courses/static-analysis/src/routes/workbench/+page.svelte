<!-- The workbench on its own page: write any rule, run it on fixtures, inspect them, and run it on the corpus. -->
<script lang="ts">
  import { COURSE_TITLE } from '$content/outline';
  import Workbench from '$lib/components/workbench/Workbench.svelte';
  import type { WorkbenchSpec } from '$lib/sa/exercise';

  const spec: WorkbenchSpec = {
    id: 'workbench/free',
    kind: 'workbench',
    playground: true,
    corpus: true,
    key: 'R',
    files: {
      'rule.ts': `import type { Rule } from 'eslint';
import type estree from 'estree';
import { report, toSecondaryLocation } from '../helpers/location.js';
import { getFullyQualifiedName } from '../helpers/module.js';

/**
 * A rule of your own. Edit it, press Run (Mod-Enter), open the inspector to see what the rule sees,
 * and run it on the corpus. Press F12 on a helper to read the kit's source.
 */
export const rule: Rule.RuleModule = {
  meta: { messages: { sonarRuntime: '{{sonarRuntimeData}}' } },
  create(context) {
    return {
      CallExpression(node: estree.CallExpression) {
        if (getFullyQualifiedName(context, node) === 'child_process.exec') {
          report(context, { node, message: 'Make sure this command cannot be influenced by a user.' }, [toSecondaryLocation(node.arguments[0] ?? node)]);
        }
      },
    };
  },
};
`,
    },
    fixtures: {
      'cb.fixture.ts': `import { exec } from 'child_process';
import * as cp from 'node:child_process';

exec('ls'); // Noncompliant {{Make sure this command cannot be influenced by a user.}}
cp.exec('ls -la'); // Noncompliant
cp.execFile('ls', ['-la']);
`,
    },
  };
</script>

<svelte:head>
  <title>The workbench — {COURSE_TITLE}</title>
  <meta name="description" content="Write an ESLint rule in TypeScript with a language server, run it on comment-based fixtures and on the course corpus." />
</svelte:head>

<div class="page">
  <h1>The workbench</h1>
  <p class="lede">
    A rule of your own, with everything the chapters’ exercises have: a TypeScript language server, comment-based
    fixtures, the inspector, and a run on the corpus (Corkboard and two small projects). Your work is not saved here;
    use <strong>Export</strong> to keep it.
  </p>
  <Workbench {spec} />
</div>

<style>
  .page {
    max-width: 68rem;
    margin: 0 auto;
    padding: 2rem max(1rem, 3vw) 4rem;
  }
  h1 {
    font-family: var(--font-display);
    margin: 0.5rem 0;
  }
  .lede {
    max-width: 46rem;
    color: var(--ink-2);
  }
</style>
