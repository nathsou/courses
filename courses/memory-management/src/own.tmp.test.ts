import { test } from 'vitest';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { Vm } from './lib/mm/mote/vm';
import { makeManager } from './lib/mm/managers/managers';
test('own', () => {
  const D = '/tmp/claude-0/-home-user-courses/b9eb68f2-bccc-5f35-8ea4-4d575c0ece9f/scratchpad/own/';
  const out: string[] = [];
  for (const f of readdirSync(D).filter((x) => x.endsWith('.mote'))) {
    for (const s of ['ownership', 'manual'] as const) {
      const vm = new Vm(readFileSync(D + f, 'utf8'), makeManager(s));
      try { vm.run(); } catch (e) { out.push('THROW ' + e); }
      out.push(`${f} ${s}: ${vm.status} ${vm.error?.message ?? ''} | ${vm.output.join(' / ')} | ${JSON.stringify(vm.summary())} | frees: ${vm.events.filter((e) => e.kind === 'free').map((e: any) => '#' + e.id + '@' + e.t).join(' ')}`);
    }
  }
  writeFileSync(D + 'out.txt', out.join('\n'));
});
