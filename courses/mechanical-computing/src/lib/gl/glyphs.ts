/**
 * The glyph atlas for digit and letter decals, drawn once per page with Canvas 2D in the course's display
 * face (falling back to a serif). Cells follow GLYPHS in ./mesh.ts.
 */
import { ATLAS, GLYPHS } from './mesh.ts';

let atlas: HTMLCanvasElement | null = null;

export function drawAtlas(): HTMLCanvasElement {
  if (atlas) return atlas;
  const cell = 128;
  const c = document.createElement('canvas');
  c.width = c.height = cell * ATLAS;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${cell * 0.8}px "Playfair Display Variable", Didot, Georgia, serif`;
  [...GLYPHS].forEach((ch, i) => {
    const x = (i % ATLAS) * cell + cell / 2, y = Math.floor(i / ATLAS) * cell + cell / 2 + cell * 0.04;
    g.fillText(ch, x, y);
  });
  atlas = c;
  return c;
}
