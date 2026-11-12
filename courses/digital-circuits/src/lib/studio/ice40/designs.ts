/**
 * The designs the iCE40 studio can open (`::fpga-studio{design="counter"}`): their Weft files (from
 * `content/designs/`), their top module, and where they go: a board, or a bare part whose pins the placer
 * chooses (a design with more ports than a board has pins).
 */
import { designSource } from '$lib/widgets/weft/designs';
import type { SourceFile } from '$lib/synth/api';
import { BOARDS } from './boards';
import type { Target } from './run';

export interface StudioDesign {
  id: string;
  title: string;
  /** Files of `content/designs/`, without the extension. */
  files: string[];
  top: string;
  target: Target;
}

/** An HX8K in its 256-ball package, with pins enough for a 32-bit datapath. */
export const HX8K_CT256: Target = { name: 'iCE40 HX8K, CT256 package', part: 'hx8k', package: 'ct256', pcf: '' };

export const STUDIO_DESIGNS: Record<string, StudioDesign> = {
  counter: { id: 'counter', title: 'The 4-bit counter on the Go Board', files: ['counter', 'counter-chip'], top: 'top', target: BOARDS['go-board'] },
  'traffic-light': { id: 'traffic-light', title: 'The traffic light', files: ['traffic-light'], top: 'traffic_light', target: { name: 'iCE40 HX1K, VQ100 package', part: 'hx1k', package: 'vq100', pcf: '' } },
  alu: { id: 'alu', title: 'The RV32I ALU', files: ['alu'], top: 'alu', target: HX8K_CT256 },
};

export function studioFiles(d: StudioDesign): SourceFile[] {
  return d.files.map((f) => {
    const text = designSource(f);
    if (text === undefined) throw new Error(`no design ${f}`);
    return { name: `${f}.weft`, text };
  });
}
