<script lang="ts">
  import type { FigureId } from '$lib/outline';
  import Plot from './Plot.svelte';
  import { energyBudget, provision, childhood, toothDays, dietLevel, processing, gaitCost, travel, heatBalance, cylinder } from '$lib/models';
  let { id }: { id: FigureId } = $props();
  let intake = $state(2400), resting = $state(1600), activity = $state(600);
  let season = $state(1), sharing = $state(true);
  let age = $state(5), brainView = $state('demand'), denominator = $state('resting');
  let periodicity = $state(8), initial = $state(90);
  let baseline = $state(5), enrichment = $state(3.5), clue = $state(0);
  let group = $state(4), gain = $state(150), fuel = $state(450);
  let gait = $state<'walk' | 'run'>('walk'), speed = $state(1.3), mass = $state(65), distance = $state(5), plotView = $state('cost');
  let fossil = $state(2);
  let air = $state(30), humidity = $state(40), metabolic = $state(350), sweat = $state(0.35), insulation = $state(0);
  let height = $state(1.7);
  let nicheStage = $state(0);
  const budget = $derived(energyBudget(intake, resting, activity));
  const family = $derived(provision(season, sharing));
  const treatment = $derived(processing(group, gain, fuel));
  const journey = $derived(travel(speed, gait, mass, distance));
  const heat = $derived(heatBalance(air, humidity, metabolic, sweat, insulation));
  const geometry = $derived(cylinder(0.065, height));
  const f = (n: number, digits = 0) => n.toLocaleString('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const fossils = [
    { name: 'Sahelanthropus', when: 'About 7 million years ago', x: 35, y: 100, region: 'Chad', preserved: 'Cranium; limb remains attributed to the species.', inference: 'Cranial and limb evidence has been used to argue for bipedality, alongside climbing. Attribution and locomotor reconstruction require care.' },
    { name: 'Ardipithecus ramidus', when: 'About 4.4 million years ago', x: 205, y: 75, region: 'Ethiopia', preserved: 'A reconstructed partial skeleton, including pelvis and a grasping foot.', inference: 'A combination of terrestrial bipedal features and arboreal capacities; its locomotion was not modern human walking.' },
    { name: 'Australopithecus afarensis', when: 'About 3.9–2.9 million years ago', x: 270, y: 145, region: 'East Africa', preserved: 'Lucy and other skeletons; Laetoli footprints are commonly attributed to this species.', inference: 'Multiple lines of evidence support habitual bipedalism. The balance of climbing and terrestrial movement remains an active question.' },
    { name: 'Early Homo', when: 'From about 2.8 million years ago', x: 350, y: 90, region: 'Africa; later Eurasia', preserved: 'Jaws, crania and varied postcranial remains; later skeletons preserve longer legs.', inference: 'Homo includes varied body plans. A species label is not a measured gait or a complete ancestral link.' },
    { name: 'Neanderthals', when: 'Later Middle & Late Pleistocene', x: 510, y: 75, region: 'Western Eurasia', preserved: 'Numerous skeletons, teeth and archaeological contexts.', inference: 'Fully habitual bipeds with a different average body build from many recent humans. Their energetic costs require reconstruction.' },
    { name: 'Homo sapiens', when: 'From about 300,000 years ago', x: 515, y: 175, region: 'Africa; later worldwide', preserved: 'Fossils, archaeology and living-human comparisons.', inference: 'Living humans provide measured gait costs, while variation and environmental context remain important.' }
  ];
  const niche = [
    { label: 'A practice changes', title: 'People begin keeping milk-producing animals', body: 'Archaeological residues can establish dairy use. Cultural adoption can precede common genetic lactase persistence; processing offers additional ways to use milk.' },
    { label: 'The environment changes', title: 'Milk becomes part of a new food environment', body: 'Availability, seasonality, fermentation, disease and shortages change the consequences of milk use. These conditions vary by place and time.' },
    { label: 'Selection can change', title: 'Existing inherited variation can have different consequences', body: 'When variants influence survival or reproduction, their frequencies can change across generations. A practice does not deliberately create the needed mutation.' },
    { label: 'Test the feedback', title: 'Bring archaeology and ancient DNA together', body: 'Compare the chronology of milk use with allele frequencies. Evershed and colleagues (2022) found that milk use alone did not explain the European selection pattern; famine and pathogen contexts were proposed.' }
  ];
  const titles: Record<FigureId, string> = { budget: 'Where does a day’s energy go?', sharing: 'Sharing changes who meets their needs', brain: 'Size, demand and growth have different clocks', tooth: 'A tooth records time', diet: 'The baseline changes the inference', processing: 'When does processing pay?', gait: 'Power is not the cost of a kilometre', fossils: 'Several ways of being a biped', heat: 'Follow the routes of heat', geometry: 'The same volume, a different surface', niche: 'A cultural practice can change selection' };
  function reset() {
    intake = 2400; resting = 1600; activity = 600; season = 1; sharing = true;
    age = 5; brainView = 'demand'; denominator = 'resting'; periodicity = 8; initial = 90;
    baseline = 5; enrichment = 3.5; clue = 0; group = 4; gain = 150; fuel = 450;
    gait = 'walk'; speed = 1.3; mass = 65; distance = 5; plotView = 'cost'; fossil = 2;
    air = 30; humidity = 40; metabolic = 350; sweat = 0.35; insulation = 0; height = 1.7; nicheStage = 0;
  }
</script>

<figure class="widget" id="figure-{id}" aria-labelledby="figure-title-{id}">
  <div class="figure-heading"><div><span class="eyebrow">Explore · {id === 'fossils' || id === 'niche' ? 'Evidence guide' : 'Illustrative model'}</span><h3 id="figure-title-{id}">{titles[id]}</h3></div><button class="reset" onclick={reset}>Reset</button></div>
  {#if id === 'budget'}
    <p>Discover why organ costs cannot be added to a total that already includes them. Move intake first, then activity.</p>
    <div class="controls">
      <label>Food energy <span class="control-value">{f(intake)} kcal/day</span><input type="range" min="1400" max="3600" step="100" bind:value={intake}/></label>
      <label>Resting expenditure <span class="control-value">{f(resting)} kcal/day</span><input type="range" min="1200" max="2200" step="100" bind:value={resting}/></label>
      <label>Activity above rest <span class="control-value">{f(activity)} kcal/day</span><input type="range" min="200" max="1400" step="100" bind:value={activity}/></label>
    </div>
    <div class="energy-bars" role="img" aria-label="Expenditure comprises resting energy, activity and digestion. The brain is within rest.">
      <div class="energy-row"><span>Intake</span><div><i style:width="{intake / 40}%" class="intake-bar">{f(intake)}</i></div></div>
      <div class="energy-row"><span>Expenditure</span><div class="stack"><i style:width="{resting / 40}%" class="rest-bar">Rest</i><i style:width="{activity / 40}%" class="activity-bar">Activity</i><i style:width="{budget.digestion / 40}%" class="digest-bar"></i></div></div>
    </div>
    <dl class="results"><div><dt>Total expenditure</dt><dd>{f(budget.expenditure)} <small>kcal/day</small></dd></div><div><dt>Balance → reserves</dt><dd>{budget.balance > 0 ? '+' : ''}{f(budget.balance)} <small>kcal/day</small></dd></div><div><dt>Brain, included in rest</dt><dd>{f(budget.brain)} <small>kcal/day</small></dd></div></dl>
    <details><summary>Accounting & assumptions</summary><p>Intake is metabolizable food energy. Expenditure = rest + activity above rest + digestion. Brain cost is an illustrative 20% of rest, already inside rest. Digestion is fixed here at 10% of intake; actual costs vary with food and physiology. This model omits growth, pregnancy and lactation. Balance means change in stored energy, not a prediction of body weight. Expenditure and heat are not two separate charges.</p></details>
  {:else if id === 'sharing'}
    <p>Discover how a group surplus can coexist with individual shortfalls. Switch sharing off, then reduce the resource return.</p>
    <div class="controls"><label>Resource return <span class="control-value">{f(season * 100)}% of the example day</span><input type="range" min="0.6" max="1.3" step="0.05" bind:value={season}/></label><label class="switch"><input type="checkbox" bind:checked={sharing}/> Pool surpluses to meet shortfalls</label></div>
    <div class="table-scroll"><table><caption>Illustrative household · kcal/day</caption><thead><tr><th>Person</th><th>Acquired</th><th>Need</th><th>Transfer</th><th>Shortfall</th></tr></thead><tbody>{#each family.rows as p}<tr><th>{p.person}</th><td>{f(p.acquired)}</td><td>{f(p.need)}</td><td>{p.transfer > 0 ? '+' : ''}{f(p.transfer)}</td><td class:shortfall={p.shortfall > 0}>{f(p.shortfall)}</td></tr>{/each}</tbody></table></div>
    <dl class="results"><div><dt>Acquired by the group</dt><dd>{f(family.total)} <small>kcal/day</small></dd></div><div><dt>Remaining shortfall</dt><dd>{f(family.shortfall)} <small>kcal/day</small></dd></div></dl>
    <p class="observation">{family.shortfall < 1 ? 'This allocation meets all needs in the example.' : sharing ? 'Sharing redistributes what exists. It cannot fill a group-wide shortage.' : 'Resources remain with their acquirers; an aggregate surplus can leave dependants short.'}</p>
    <details><summary>Model boundary</summary><p>These are synthetic daily inputs, not measurements of a past or living society. Sharing transfers the smaller of the total surplus and total deficit, distributing it in proportion to each shortfall. Transfers sum to zero. Needs and acquisition are independent of sex; this illustrates provisioning without prescribing kinship, labour or social institutions.</p></details>
  {:else if id === 'brain'}
    <p>Discover why a nearly adult-sized brain need not have adult energy demand. The curves below are schematic, not digitised measurements.</p>
    <div class="controls"><label>Inspect age <span class="control-value">{age} years</span><input type="range" min="0" max="20" step="1" bind:value={age}/></label><label>Brain curve <select bind:value={brainView}><option value="demand">Glucose demand</option><option value="volume">Volume</option></select></label></div>
    <Plot title="Different developmental clocks" description="Schematic glucose demand peaks in childhood while growth is relatively slow; volume rises earlier and plateaus." xMax={20} yMax={100} xLabel="Age (years)" yLabel="Relative index · each series scaled separately" marker={age} series={[
      { name: brainView === 'demand' ? 'Brain glucose demand' : 'Brain volume', color: 'var(--forest)', points: childhood.map(p => [p.age, brainView === 'demand' ? p.demand : p.volume]) },
      { name: 'Body growth rate', color: 'var(--ochre)', points: childhood.map(p => [p.age, p.growth]), dashed: true }
    ]}/>
    <p class="observation">{age < 3 ? 'Early life: rapid enlargement and rapid body growth. A volume ratio alone does not establish neurological maturity.' : age < 9 ? 'Childhood: glucose demand is high while body growth is relatively slow. Similar-looking curves do not alone prove a single causal mechanism.' : 'Later development: brain volume approaches its plateau while neural maturation and body growth continue on different schedules.'}</p>
    <div class="published-anchor"><span class="eyebrow">Published finding · Kuzawa et al. (2014)</span><label>Childhood peak, expressed against <select bind:value={denominator}><option value="resting">Resting expenditure</option><option value="daily">Total daily expenditure</option></select></label><p class="anchor-number">≈ {denominator === 'resting' ? '66' : '43'}% <small>glucose demand expressed as an energy equivalent</small></p><p class="small">Reported childhood peak equivalents are about 66% of resting expenditure and 43% of daily requirements. These are the study’s estimates, not values calculated from our schematic curves.</p></div>
    <details><summary>Schematic data & limits</summary><p>The table exposes the illustrative drawing coordinates. Each series has its own scale; equality of index values does not mean equality of physical quantities. The figure teaches timing, not exact age-specific demands. The published peak is separately sourced from <a href="https://doi.org/10.1073/pnas.1323099111">Kuzawa et al.</a></p><table><thead><tr><th>Age</th><th>Volume index</th><th>Demand index</th><th>Growth index</th></tr></thead><tbody>{#each childhood as p}<tr><td>{p.age}</td><td>{p.volume}</td><td>{p.demand}</td><td>{p.growth}</td></tr>{/each}</tbody></table></details>
  {:else if id === 'tooth'}
    <p>Discover how uncertainty in the spacing of long-period growth lines affects a formation-time estimate. This tooth is an original schematic.</p>
    <svg viewBox="0 0 600 185" role="img" aria-label="Schematic tooth section with 24 long-period increments, starting after an initial formation period."><path d="M70 160Q70 25 280 22Q490 25 520 160Z" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/>{#each Array.from({length:24},(_,i)=>i) as i}<path d="M{90+i*7} 156Q{112+i*6} {45+i*4} 500 158" fill="none" stroke="var(--ochre)" opacity="0.7"/>{/each}<text x="300" y="178" text-anchor="middle">24 counted intervals · not to anatomical scale</text></svg>
    <div class="controls"><label>Days per interval <span class="control-value">{periodicity} days</span><input type="range" min="6" max="10" step="1" bind:value={periodicity}/></label><label>Earlier formation period <span class="control-value">{initial} days</span><input type="range" min="0" max="180" step="10" bind:value={initial}/></label></div>
    <p class="anchor-number">{toothDays(24, periodicity, initial)} <small>days of formation represented</small></p>
    <details><summary>Why this is not the age at death</summary><p>Here duration = earlier formation + 24 × interval periodicity. Real researchers calibrate periodicity against daily increments and synchronise multiple teeth, sometimes using a neonatal line. They also need the age when a tooth began formation and the time represented by its crown and root. A crown’s formation duration alone is not total lifespan.</p></details>
  {:else if id === 'diet'}
    <p>Discover why a high isotope value needs a local comparison. The synthetic sample has δ¹⁵N = 12‰; move the local baseline before drawing a conclusion.</p>
    <div class="controls"><label>Local comparison baseline <span class="control-value">{baseline}‰</span><input type="range" min="2" max="9" step="0.5" bind:value={baseline}/></label><label>Illustrative trophic increment <span class="control-value">{enrichment}‰</span><input type="range" min="2" max="5" step="0.5" bind:value={enrichment}/></label></div>
    <div class="isotope-track" role="img" aria-label="The sample is fixed at 12 per mille while the baseline moves."><div class="baseline-point" style:left="{baseline / 16 * 100}%"><span>Baseline {baseline}‰</span></div><div class="sample-point" style:left="75%"><span>Sample 12‰</span></div><span class="scale-start">0‰</span><span class="scale-end">16‰</span></div>
    <p class="anchor-number">{f(dietLevel(12, baseline, enrichment),1)} <small>illustrative increments above this baseline</small></p>
    <div class="clue-tabs" role="group" aria-label="Inspect another line of evidence">{#each ['Collagen', 'Plant residues', 'Local fauna'] as c,i}<button aria-pressed={clue===i} onclick={() => clue=i}>{c}</button>{/each}</div>
    <p class="observation">{clue === 0 ? 'Collagen isotope values chiefly track dietary protein. The estimate is not a percentage of meat calories.' : clue === 1 ? 'Starch grains in dental calculus can establish contact with plants, subject to contamination and interpretation. They do not quantify every meal.' : 'Fauna from the same context help establish a local baseline. Species, tissue, chronology and preservation must match the comparison.'}</p>
    <details><summary>Model assumptions</summary><p>(Sample − baseline) ÷ increment is a deliberately simplified trophic comparison. The sample, baseline and increment here are synthetic. Real isotope studies consider tissue-specific fractionation, ecology, dietary routing, nursing, preservation and uncertainty; they do not reduce diet to this single equation. Nitrogen ratios are written δ¹⁵N and expressed in per mille (‰), not percent.</p></details>
  {:else if id === 'processing'}
    <p>Discover how a shared preparation cost can change the return per eater. First double the group size, then raise the fuel-gathering cost.</p>
    <div class="controls"><label>Eaters <span class="control-value">{group}</span><input type="range" min="1" max="10" step="1" bind:value={group}/></label><label>Assumed usable-energy gain per eater <span class="control-value">{gain} kcal</span><input type="range" min="0" max="300" step="25" bind:value={gain}/></label><label>Human work to prepare & gather fuel <span class="control-value">{fuel} kcal</span><input type="range" min="0" max="1200" step="50" bind:value={fuel}/></label></div>
    <dl class="results"><div><dt>Additional usable food energy</dt><dd>{f(treatment.benefit)} <small>kcal</small></dd></div><div><dt>Net gain after human work</dt><dd>{treatment.net > 0 ? '+' : ''}{f(treatment.net)} <small>kcal</small></dd></div></dl>
    <details><summary>What this calculation leaves out</summary><p>All coefficients are hypothetical. Benefits may differ between slicing, pounding and heating, and between foods. The work input is the eaters’ metabolic expenditure, not the fuel’s combustion energy; fuel heat is external energy and is not subtracted as though a person ate it. Preparation time, food safety, nutrient availability and opportunity costs require separate evidence. This arithmetic cannot date the invention of cooking.</p></details>
  {:else if id === 'gait'}
    <p>Discover why a higher power requirement can coexist with a similar cost per distance. These curves illustrate the relationship; they are not fits to published measurements.</p>
    <div class="controls"><label>Gait <select aria-label="Gait" bind:value={gait} onchange={e => { gait = e.currentTarget.value as 'walk' | 'run'; speed = gait === 'walk' ? 1.3 : 3; }}><option value="walk">Walk</option><option value="run">Run</option></select></label><label>Speed <span class="control-value">{f(speed,1)} m/s</span><input type="range" min={gait==='walk'?0.5:1.5} max={gait==='walk'?2.2:4.5} step="0.1" bind:value={speed}/></label><label>Graph quantity <select bind:value={plotView}><option value="cost">Energy per distance</option><option value="power">Power per mass</option></select></label><label>Distance <span class="control-value">{distance} km</span><input type="range" min="1" max="20" step="1" bind:value={distance}/></label></div>
    <Plot title="Gait costs" description="A schematic walking curve has a minimum; running cost per distance is relatively flat, while power increases with speed." xMax={5} yMax={plotView==='cost'?10:22} xLabel="Speed (m/s)" yLabel={plotView==='cost'?'Cost (kJ/kg/km)':'Power above rest (W/kg)'} marker={speed} series={[
      { name:'Walking', color:'var(--forest)', points:Array.from({length:18},(_,i)=>{const v=0.5+i*0.1;return [v,gaitCost(v,'walk')*(plotView==='power'?v:1)]}) },
      { name:'Running', color:'var(--ochre)', points:Array.from({length:31},(_,i)=>{const v=1.5+i*0.1;return [v,gaitCost(v,'run')*(plotView==='power'?v:1)]}) }
    ]}/>
    <dl class="results"><div><dt>For a {mass} kg example body</dt><dd>{f(journey.energy)} <small>kJ over {distance} km</small></dd></div><div><dt>Power above rest</dt><dd>{f(journey.power)} <small>W</small></dd></div><div><dt>Travel time</dt><dd>{f(journey.hours,2)} <small>hours</small></dd></div></dl>
    <details><summary>Equations & model boundary</summary><p>Cost C is in kJ/kg/km, equivalent to J/kg/m. Energy = C × mass × distance. Power = C × mass × speed, with speed in m/s. The illustrative curves use C(walk) = 1.8 + 6(v − 1.3)² and C(run) = 4 + 0.05(v − 3)². They teach a U-shaped walking cost and a flatter running cost; coefficients are not empirical estimates. No fossil performance is calculated. Resting energy, terrain, loading and thermoregulation are omitted.</p></details>
  {:else if id === 'fossils'}
    <p>Explore the combination of preserved evidence and inferred behaviour. The lines provide orientation in time; they do not assert direct ancestry.</p>
    <svg viewBox="0 0 600 245" role="img" aria-label="Selected hominins arranged from approximately seven million years ago to the present, with uncertain relationships shown as dashed guides."><path d="M35 100L205 75L270 145L350 90L510 75M350 90L515 175" fill="none" stroke="var(--line-strong)" stroke-width="2" stroke-dasharray="6 6"/>{#each fossils as p,i}<circle cx={p.x} cy={p.y} r={fossil===i?10:6} fill={fossil===i?'var(--forest)':'var(--ochre)'}/><text x={p.x} y={p.y+(i%2===0?25:-18)} text-anchor="middle" font-size="12">{p.name}</text>{/each}<path class="axis" d="M35 215H555"/><text x="35" y="237">Older</text><text x="555" y="237" text-anchor="end">More recent · schematic spacing</text></svg>
    <label class="fossil-select">Inspect a group <select bind:value={fossil}>{#each fossils as p,i}<option value={i}>{p.name}</option>{/each}</select></label>
    <div class="specimen-card"><span class="eyebrow">{fossils[fossil]!.region} · {fossils[fossil]!.when}</span><h4>{fossils[fossil]!.name}</h4><p><strong>Preserved:</strong> {fossils[fossil]!.preserved}</p><p><strong>Inference:</strong> {fossils[fossil]!.inference}</p></div>
    <figcaption>Selected examples from the lecture. This is an original schematic guide, with non-proportional time spacing and uncertain relationships. Modern apes are evolving comparison lineages, not our ancestors.</figcaption>
  {:else if id === 'heat'}
    <p>Discover why producing sweat and evaporating it have different consequences. Compare the same activity in dry and humid air.</p>
    <div class="controls"><label>Air temperature <span class="control-value">{air}°C</span><input type="range" min="0" max="42" step="1" bind:value={air}/></label><label>Relative humidity <span class="control-value">{humidity}%</span><input type="range" min="10" max="100" step="5" bind:value={humidity}/></label><label>Metabolic power <span class="control-value">{metabolic} W</span><input type="range" min="100" max="700" step="25" bind:value={metabolic}/></label><label>Sweat supplied <span class="control-value">{f(sweat,2)} L/hour</span><input type="range" min="0" max="1" step="0.05" bind:value={sweat}/></label><label>Illustrative insulation <select bind:value={insulation}><option value={0}>None</option><option value={1}>Moderate</option><option value={3}>High</option></select></label></div>
    <svg viewBox="0 0 600 190" role="img" aria-label="Heat produced {f(heat.produced)} watts; dry exchange {f(heat.dry)} watts outward; evaporation {f(heat.evaporative)} watts outward. Negative dry exchange means environmental heat enters the body.">
      <circle cx="300" cy="85" r="47" fill="var(--panel)" stroke="var(--line-strong)" stroke-width="1.5"/>
      <text x="300" y="82" text-anchor="middle">Body heat</text><text x="300" y="102" text-anchor="middle">{heat.balance>0?'+':''}{f(heat.balance)} W</text>
      <path d="M45 85H242l-8-5m8 5-8 5" fill="none" stroke="var(--forest)" stroke-width="2"/><text x="135" y="62" text-anchor="middle">Produced · {f(heat.produced)} W</text>
      <path d={heat.dry>=0?'M342 56L508 25l-9-3m9 3-6 7':'M508 25L342 56l6-7m-6 7 9 3'} fill="none" stroke="var(--ochre)" stroke-width="2"/><text x="451" y="64" text-anchor="middle">Dry · {f(heat.dry)} W</text>
      <path d="M342 111L508 142l-6-7m6 7-9 3" fill="none" stroke="var(--forest)" stroke-width="2"/><text x="450" y="171" text-anchor="middle">Evaporation · {f(heat.evaporative)} W</text>
      <text x="300" y="153" text-anchor="middle">{heat.balance>0?'Net storage tendency':'Loss exceeds production'}</text>
    </svg>
    <dl class="results heat-results"><div><dt>Heat produced</dt><dd>{f(heat.produced)} <small>W</small></dd></div><div><dt>Dry exchange · outward +</dt><dd>{f(heat.dry)} <small>W</small></dd></div><div><dt>Evaporative loss</dt><dd>{f(heat.evaporative)} <small>W</small></dd></div><div><dt>Unbalanced heat</dt><dd>{heat.balance>0?'+':''}{f(heat.balance)} <small>W</small></dd></div></dl>
    <p class="observation">{heat.balance>20?'The chosen terms imply net heat storage. Change the conditions to find which route can relieve it.':heat.balance < -20?'Loss exceeds production in this simplified account. Real bodies change blood flow, behaviour and metabolism.':'The chosen terms approximately balance; real physiology still requires more detail.'}</p>
    <details><summary>Inspect the assumptions</summary><p>Heat produced = 80% of metabolic power; the remaining 20% is external work in this example. Skin is fixed at 34°C and area at 1.8 m². Dry exchange = 8 × area × (skin − air) ÷ (1 + insulation). A litre/hour of fully evaporated water carries roughly 674 W; the toy humidity multiplier is clamped (100 − humidity)/60. This linear multiplier is illustrative: real evaporation depends on skin–air vapour-pressure gradients, wind and clothing. Dry exchange lumps radiation and convection together, and omits sunlight, conduction and respiratory loss. A positive balance indicates a tendency, not a calculated body temperature or a safe activity limit.</p></details>
  {:else if id === 'geometry'}
    <p>Discover how changing proportions can alter exposed surface without changing volume. Our “body” is simply a cylinder.</p>
    <div class="controls"><label>Cylinder height <span class="control-value">{f(height,2)} m</span><input type="range" min="1.2" max="2.1" step="0.05" bind:value={height}/></label></div>
    <svg viewBox="0 0 600 190" role="img" aria-label="A cylinder of fixed volume becomes narrower as its height increases."><rect x={300-geometry.radius*280} y={165-height*60} width={geometry.radius*560} height={height*60} rx="16" fill="var(--panel)" stroke="var(--forest)" stroke-width="2"/><ellipse cx="300" cy={165-height*60} rx={geometry.radius*280} ry="12" fill="var(--panel)" stroke="var(--forest)" stroke-width="2"/><text x="430" y="100">Fixed volume</text><text x="430" y="124">0.065 m³</text></svg>
    <dl class="results"><div><dt>Surface area</dt><dd>{f(geometry.area,2)} <small>m²</small></dd></div><div><dt>Surface / volume</dt><dd>{f(geometry.ratio,1)} <small>m⁻¹</small></dd></div></dl>
    <details><summary>Geometry, not a population model</summary><p>Volume = πr²h. Surface = 2πrh + 2πr². Volume is fixed at 0.065 m³. A human body has limbs, changing skin blood flow and insulation; this cylinder cannot predict an individual’s cold tolerance or reconstruct a fossil’s physiology. It illustrates one geometric relationship behind climatic explanations of body proportions.</p></details>
  {:else if id === 'niche'}
    <p>Trace the feedback, then distinguish the observations needed at each step.</p>
    <ol class="niche-steps">{#each niche as step,i}<li><button aria-pressed={nicheStage===i} onclick={() => nicheStage=i}><span>{String(i+1).padStart(2,'0')}</span>{step.label}</button></li>{/each}</ol>
    <div class="specimen-card"><h4>{niche[nicheStage]!.title}</h4><p>{niche[nicheStage]!.body}</p></div>
    <figcaption>A conceptual evidence guide based on the dairying example; it does not calculate selection coefficients or allele frequencies. <a href="https://doi.org/10.1038/s41586-022-05010-7">Evershed et al. (2022)</a>.</figcaption>
  {/if}
  {#if id !== 'fossils' && id !== 'niche'}<figcaption>Illustrative inputs and simplifications are shown above. Numerical outputs are consequences of these assumptions, not new observations of human evolution.</figcaption>{/if}
</figure>
