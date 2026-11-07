/**
 * What a machine model is: named meshes, nodes (moving parts made of one or more mesh+material parts), a
 * camera, and a `pose` function that writes every node's world matrix from the machine's state.
 *
 * `pose` is the compiled evaluation order of the mechanism: a flat, hand-ordered list of writes into one
 * Float32Array, so a frame allocates nothing. Models are pure (no DOM) and are tested in Node.
 */
import type { MeshData } from './mesh.ts';

export type MaterialName = 'brass' | 'darkBrass' | 'steel' | 'iron' | 'wood' | 'ivory' | 'ink' | 'red' | 'blue' | 'green' | 'paper' | 'glass' | 'decal' | 'decalLight' | 'decalRed';

export interface PartRef {
  mesh: string;
  material: MaterialName;
}

export interface NodeDef {
  /** Unique within the model; used to look nodes up. */
  name: string;
  /** Shown when the reader taps the part. Omit to make the node unpickable. */
  label?: string;
  /** One or two sentences on what the part does. */
  info?: string;
  parts: PartRef[];
}

export interface CameraDef {
  target: [number, number, number];
  distance: number;
  yaw: number;
  pitch: number;
  fov?: number;
  /** Width/height ratio the framing was chosen for; narrower views step back to fit. */
  aspect?: number;
}

export interface ModelDef<S = unknown> {
  /** Cache namespace for this model's meshes. */
  key: string;
  meshes: Record<string, () => MeshData>;
  nodes: NodeDef[];
  camera: CameraDef;
  /** Write node world matrices (16 floats per node, in `nodes` order) for state `s`. */
  pose(m: Float32Array, s: S): void;
}

/** Index of each node by name, for pose functions and widgets. */
export function nodeIndex(nodes: NodeDef[]): Record<string, number> {
  return Object.fromEntries(nodes.map((n, i) => [n.name, i]));
}

/** Convenience for building node lists. */
export const part = (mesh: string, material: MaterialName): PartRef => ({ mesh, material });
