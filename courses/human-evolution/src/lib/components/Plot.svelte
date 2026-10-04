<script lang="ts">
  export interface Series { name: string; color: string; points: [number, number][]; dashed?: boolean }
  let { title, description, series, xMax, yMax, xLabel, yLabel, marker = null }: { title: string; description: string; series: Series[]; xMax: number; yMax: number; xLabel: string; yLabel: string; marker?: number | null } = $props();
  const x = (n: number) => 60 + n / xMax * 500;
  const y = (n: number) => 250 - n / yMax * 210;
</script>
<svg class="plot" viewBox="0 0 600 310" role="img" aria-label="{title}. {description}">
  <title>{title}</title><desc>{description}</desc>
  {#each [0, 0.25, 0.5, 0.75, 1] as tick}
    <line class="grid-line" x1="60" x2="560" y1={y(tick * yMax)} y2={y(tick * yMax)}/>
    <text x="48" y={y(tick * yMax) + 4} text-anchor="end">{Number((tick * yMax).toFixed(1))}</text>
    <text x={x(tick * xMax)} y="274" text-anchor="middle">{Number((tick * xMax).toFixed(1))}</text>
  {/each}
  <path class="axis" d="M60 40V250H560"/>
  {#each series as s}<polyline points={s.points.map(([a,b]) => `${x(a)},${y(b)}`).join(' ')} fill="none" stroke={s.color} stroke-width="3" stroke-dasharray={s.dashed ? '7 5' : undefined}/>{/each}
  {#if marker !== null}<line x1={x(marker)} x2={x(marker)} y1="40" y2="250" class="marker"/>{/if}
  <text x="310" y="303" text-anchor="middle">{xLabel}</text>
  <text x="8" y="20">{yLabel}</text>
</svg>
<div class="plot-key">{#each series as s}<span><i style:background={s.color}></i>{s.name}{s.dashed ? ' (dashed)' : ''}</span>{/each}</div>
