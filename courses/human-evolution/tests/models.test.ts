import test from 'node:test';
import assert from 'node:assert/strict';
import { energyBudget, provision, travel, heatBalance, cylinder, dietLevel, toothDays } from '../src/lib/models.ts';
import { chapters, figureIds } from '../src/lib/outline.ts';
import { questions } from '../src/lib/questions.ts';
import { symposium } from '../src/lib/symposium.ts';
import { readFileSync } from 'node:fs';
const close = (a: number, b: number) => assert.ok(Math.abs(a-b)<1e-8, `${a} ≠ ${b}`);

test('the adult account conserves energy and includes the brain exactly once', () => {
  for (const intake of [1400,2400,3600]) for (const activity of [200,800,1400]) {
    const b=energyBudget(intake,1600,activity);
    close(b.expenditure+b.balance,intake);
    close(b.expenditure,1600+activity+b.digestion);
    assert.ok(b.brain<1600);
  }
});
test('transfers conserve acquired energy, cannot create it, and meet every attainable need', () => {
  for (const factor of [0.6,0.8,1,1.3]) for (const share of [false,true]) {
    const f=provision(factor,share);
    close(f.rows.reduce((s,p)=>s+p.transfer,0),0);
    close(f.rows.reduce((s,p)=>s+p.available,0),f.total);
    if (share) close(f.shortfall,Math.max(0,f.need-f.total));
    for (const p of f.rows) assert.ok(p.available>=0);
  }
  assert.ok(provision(1,false).shortfall>0);
  close(provision(1,true).shortfall,0);
});
test('travel energy and power describe the same journey with consistent units', () => {
  for (const gait of ['walk','run'] as const) for (const speed of [1.5,2]) {
    const t=travel(speed,gait,65,10);
    close(t.power*t.hours*3600,t.energy*1000);
    close(travel(speed,gait,65,20).energy,2*t.energy);
  }
});
test('heat exchange can reverse, humidity restricts evaporation, and insulation reduces dry exchange', () => {
  const cold=heatBalance(10,40,350,0.3,0),hot=heatBalance(40,40,350,0.3,0);
  assert.ok(cold.dry>0); assert.ok(hot.dry<0);
  assert.ok(heatBalance(30,95,350,0.3,0).evaporative<heatBalance(30,20,350,0.3,0).evaporative);
  assert.ok(heatBalance(10,40,350,0.3,3).dry<cold.dry);
  close(heatBalance(30,100,350,0.3,0).evaporative,0);
});
test('geometry holds volume constant while proportions change', () => {
  for (const h of [1.2,1.7,2.1]) { const c=cylinder(.065,h); close(Math.PI*c.radius**2*h,.065); }
  assert.ok(cylinder(.065,2.1).area>cylinder(.065,1.2).area);
});
test('a changed baseline changes isotope inference; tooth duration is not an age-at-death contract', () => {
  assert.ok(dietLevel(12,8,3.5)<dietLevel(12,3,3.5));
  assert.ok(toothDays(24,10,90)>toothDays(24,6,90));
});
test('six complete chapters have three sessions, known activities and source intervals within the recording', () => {
  assert.equal(chapters.length,6);
  const used=new Set<string>();
  for (const chapter of chapters) {
    const text=readFileSync(new URL(`../content/${chapter.slug}.md`,import.meta.url),'utf8');
    assert.equal((text.match(/^## Session /gm)??[]).length,3,chapter.slug);
    assert.ok(text.split(/\s+/).length>1200,chapter.slug);
    assert.ok(text.split(/\s+/).length<2200,chapter.slug);
    for (const [,id] of text.matchAll(/^:::figure (.+)$/gm)) { assert.ok(figureIds.includes(id as typeof figureIds[number]),id!); used.add(id!); }
    for (const [,id] of text.matchAll(/^:::question (.+)$/gm)) assert.ok(questions[id!],id!);
    const ranges=[...text.matchAll(/^:::video (\d+)-(\d+) (.+)$/gm)];
    assert.equal(ranges.length,3,chapter.slug);
    for (const [,start,end] of ranges) assert.ok(Number(start)>=0&&Number(end)>Number(start)&&Number(end)<=chapter.duration);
  }
  assert.equal(used.size,figureIds.length);
});
test('symposium recording references match the handoff, including the unrecorded talk', () => {
  const manifest=JSON.parse(readFileSync(new URL('../research/sources.json',import.meta.url),'utf8'));
  assert.equal(symposium.length,15);
  for (const talk of symposium) {
    const source=manifest.find((s:{slug:string})=>s.slug===talk.slug);
    assert.ok(source,talk.slug);
    if (talk.video) assert.equal(talk.video,source.video_id); else assert.equal(source.status,'not_recorded');
  }
  for (const c of chapters) assert.equal(manifest.find((s:{video_id:string})=>s.video_id===c.videoId).duration_seconds,c.duration);
});
test('every DOI in the prose is in the bibliography and raw captions are not published', () => {
  const refs=JSON.parse(readFileSync(new URL('../src/lib/references.json',import.meta.url),'utf8'));
  const ids=refs.map((r:{id:string})=>r.id); assert.equal(new Set(ids).size,ids.length);
  for (const c of chapters) {
    const text=readFileSync(new URL(`../content/${c.slug}.md`,import.meta.url),'utf8');
    for (const [,doi] of text.matchAll(/https:\/\/doi.org\/([^\s\)"<>]+)/g)) assert.ok(refs.some((r:{doi:string})=>r.doi===doi),doi!);
  }
  assert.ok(!readFileSync(new URL('../src/lib/content.ts',import.meta.url),'utf8').includes('research/'));
});
