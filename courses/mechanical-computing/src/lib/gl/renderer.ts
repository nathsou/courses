/**
 * The WebGL2 renderer. One Renderer owns one context and draws one model.
 *
 * Every (mesh, material) pair of a model is one batch, drawn with one instanced call: a model of 300 parts
 * built from 12 kinds of part costs 12 draw calls. Each frame writes all instance matrices into one
 * Float32Array, uploads it with a single bufferSubData, and issues the draws — no allocation.
 *
 * Two looks: "brass" (lit metal, a studio environment faked from a gradient and a soft-box band) and
 * "drawing" (flat paper or cyanotype fill with ink outlines from an inverted hull), which reads like the
 * engineering drawings the machines were built from.
 */
import { getMesh } from './cache.ts';
import { lookAt, multiply, perspective, mat4, ortho } from './math.ts';
import type { MaterialName, ModelDef } from './model.ts';
import type { MeshData } from './mesh.ts';
import { drawAtlas } from './glyphs.ts';
import { stats } from './stats.ts';

interface Material {
  color: [number, number, number];
  metal: number;
  rough: number;
  /** 0 lit, 1 decal (ink from the atlas). */
  kind: 0 | 1;
  /** Procedural wood grain strength. */
  grain?: number;
}

/** Base colours in linear RGB. */
const MATERIALS: Record<MaterialName, Material> = {
  brass: { color: [0.78, 0.55, 0.22], metal: 1, rough: 0.32, kind: 0 },
  darkBrass: { color: [0.52, 0.34, 0.12], metal: 1, rough: 0.42, kind: 0 },
  steel: { color: [0.62, 0.64, 0.68], metal: 1, rough: 0.28, kind: 0 },
  iron: { color: [0.16, 0.16, 0.17], metal: 0.65, rough: 0.45, kind: 0 },
  wood: { color: [0.2, 0.085, 0.032], metal: 0, rough: 0.55, kind: 0, grain: 1 },
  ivory: { color: [0.72, 0.65, 0.5], metal: 0, rough: 0.4, kind: 0 },
  paper: { color: [0.9, 0.86, 0.76], metal: 0, rough: 0.9, kind: 0 },
  ink: { color: [0.03, 0.03, 0.04], metal: 0, rough: 0.5, kind: 0 },
  red: { color: [0.62, 0.08, 0.05], metal: 0.2, rough: 0.4, kind: 0 },
  blue: { color: [0.06, 0.2, 0.55], metal: 0.2, rough: 0.4, kind: 0 },
  green: { color: [0.06, 0.38, 0.16], metal: 0.2, rough: 0.4, kind: 0 },
  glass: { color: [0.7, 0.8, 0.85], metal: 0, rough: 0.1, kind: 0 },
  decal: { color: [0.02, 0.02, 0.03], metal: 0, rough: 1, kind: 1 },
  decalLight: { color: [0.95, 0.92, 0.85], metal: 0, rough: 1, kind: 1 },
  decalRed: { color: [0.7, 0.05, 0.03], metal: 0, rough: 1, kind: 1 },
};

const VS = /* glsl */ `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in vec2 aUv;
layout(location=3) in vec4 aM0;
layout(location=4) in vec4 aM1;
layout(location=5) in vec4 aM2;
layout(location=6) in vec4 aM3;
layout(location=7) in vec4 aTint;
uniform mat4 uViewProj;
uniform vec3 uEye;
uniform float uOutline;
uniform mat4 uLightVP;
out vec4 vLight;
out vec3 vPos;
out vec3 vNor;
out vec2 vUv;
out vec4 vTint;
void main() {
  mat4 m = mat4(aM0, aM1, aM2, aM3);
  vec4 wp = m * vec4(aPos, 1.0);
  vec3 n = normalize(mat3(m) * aNor);
  if (uOutline > 0.0) wp.xyz += n * uOutline * length(wp.xyz - uEye);
  vPos = wp.xyz;
  vNor = n;
  vUv = aUv;
  vTint = aTint;
  vLight = uLightVP * wp;
  gl_Position = uViewProj * wp;
}`;

/** Depth from the light, for shadows: the same instanced layout, nothing but position. */
const DEPTH_VS = /* glsl */ `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=3) in vec4 aM0;
layout(location=4) in vec4 aM1;
layout(location=5) in vec4 aM2;
layout(location=6) in vec4 aM3;
uniform mat4 uLightVP;
void main() {
  gl_Position = uLightVP * (mat4(aM0, aM1, aM2, aM3) * vec4(aPos, 1.0));
}`;
const DEPTH_FS = /* glsl */ `#version 300 es
precision mediump float;
out vec4 frag;
void main() { frag = vec4(1.0); }`;

const SHADOW_SIZE = 1536;

const FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vPos;
in vec3 vNor;
in vec2 vUv;
in vec4 vTint;
in vec4 vLight;
uniform highp sampler2DShadow uShadow;
uniform int uShadows;
uniform vec3 uBg;
uniform vec3 uFloorC; // floor centre x, z and fade radius
uniform vec3 uColor;
uniform float uMetal;
uniform float uRough;
uniform float uGrain;
uniform int uKind;      // 0 lit, 1 decal, 2 floor
uniform int uLook;      // 0 brass, 1 drawing fill, 2 outline
uniform vec3 uEye;
uniform vec3 uPaper;
uniform vec3 uLine;
uniform sampler2D uAtlas;
out vec4 frag;

vec3 env(vec3 r) {
  // Studio: dark floor, warm-grey walls, one broad soft box overhead and a narrow strip light.
  float y = r.y;
  vec3 c = mix(vec3(0.1, 0.09, 0.08), vec3(0.62, 0.6, 0.56), smoothstep(-0.4, 0.5, y));
  c += vec3(1.7, 1.62, 1.5) * smoothstep(0.72, 0.9, y);
  // A broad soft box in front (the side cameras look from) and a narrow strip light to one side.
  c += vec3(1.1, 1.06, 1.0) * smoothstep(0.55, 0.92, dot(r, normalize(vec3(0.25, 0.35, 1.0))));
  c += vec3(0.9) * smoothstep(0.93, 0.99, abs(dot(r, normalize(vec3(-0.8, 0.15, 0.6)))));
  return c;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// Soft shadow: 3×3 hardware-filtered taps of the light's depth map.
float shadowAt() {
  if (uShadows == 0) return 1.0;
  vec3 p = vLight.xyz / vLight.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float s = 0.0;
  vec2 t = vec2(1.6 / ${SHADOW_SIZE}.0);
  for (int i = -1; i <= 1; i++)
    for (int j = -1; j <= 1; j++) s += texture(uShadow, vec3(p.xy + vec2(float(i), float(j)) * t, p.z - 0.0012));
  return s / 9.0;
}

void main() {
  if (uLook == 2) { frag = vec4(uLine, 1.0); return; }
  if (uKind == 2) {
    // The floor: the page colour, darkened by shadow and a little towards the middle, fading out at the edge.
    float d = length(vPos.xz - uFloorC.xy) / uFloorC.z;
    float fade = smoothstep(1.0, 0.25, d);
    float sh = shadowAt();
    vec3 c = uBg * mix(1.0, (0.955 - 0.03 * (1.0 - d)) * mix(0.66, 1.0, sh), fade);
    frag = vec4(c, 1.0);
    return;
  }
  if (uKind == 1) {
    float a = texture(uAtlas, vUv).a;
    if (a < 0.32) discard;
    vec3 c = uLook == 1 ? uLine : uColor;
    frag = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
    return;
  }
  vec3 n = normalize(vNor);
  vec3 v = normalize(uEye - vPos);
  if (dot(n, v) < 0.0) n = -n;
  if (uLook == 1) {
    // Drawing: flat fill, a hint of shading, tints for highlighted parts.
    float shade = 0.9 + 0.1 * dot(n, normalize(vec3(0.3, 0.8, 0.5)));
    vec3 fill = mix(uPaper * shade, vTint.rgb, vTint.a * 0.55);
    frag = vec4(fill, 1.0);
    return;
  }
  vec3 base = uColor;
  if (uGrain > 0.0) {
    // Wood: long rings along the longest axis of the board, gently wobbling.
    float g = sin(dot(vPos, vec3(0.6, 9.0, 1.4)) * 2.2 + sin(vPos.x * 1.7 + vPos.z * 0.9) * 2.5);
    float fine = sin(dot(vPos, vec3(2.0, 40.0, 7.0)));
    base *= 0.82 + 0.16 * g + 0.05 * fine;
  }
  vec3 l1 = normalize(vec3(0.45, 1.0, 0.55));
  vec3 l2 = normalize(vec3(-0.7, 0.3, -0.4));
  vec3 h1 = normalize(l1 + v);
  float spec = pow(max(dot(n, h1), 0.0), mix(160.0, 12.0, uRough)) * mix(1.0, 0.25, uRough);
  float sh = shadowAt();
  float d1 = max(dot(n, l1), 0.0) * sh, d2 = max(dot(n, l2), 0.0);
  vec3 f0 = mix(vec3(0.04), base, uMetal);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 F = f0 + (1.0 - f0) * fres;
  vec3 r = reflect(-v, n);
  vec3 refl = env(r) * F * (1.0 - 0.6 * uRough) * (0.55 + 0.45 * sh);
  vec3 diffuse = base * (1.0 - uMetal) * (0.18 + 1.05 * d1 + 0.35 * d2);
  vec3 c = diffuse + refl + F * spec * sh * 2.2 * (0.6 + 0.4 * d1);
  c += vTint.rgb * vTint.a * 0.65;
  frag = vec4(pow(aces(c * 1.05), vec3(1.0 / 2.2)), 1.0);
}`;

interface GpuMesh {
  vao: WebGLVertexArrayObject;
  count: number;
  type: number;
  vbo: WebGLBuffer;
  ibo: WebGLBuffer;
}

interface Batch {
  mesh: string;
  material: Material;
  nodes: number[];
  /** First instance index in the shared instance buffer. */
  first: number;
  vao: WebGLVertexArrayObject;
  count: number;
  type: number;
  /** Model-space bounding sphere of the mesh. */
  bounds: [number, number, number, number];
}

export type Look = 'brass' | 'drawing';

export interface Palette {
  bg: [number, number, number];
  paper: [number, number, number];
  line: [number, number, number];
}

const FLOATS_PER_INSTANCE = 20;

/** A unit square in the xz plane, facing up (scaled and placed per frame). */
const FLOOR: MeshData = {
  positions: new Float32Array([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1]),
  normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
  uvs: new Float32Array(8),
  indices: new Uint32Array([0, 3, 2, 0, 2, 1]),
  bounds: [0, 0, 0, 1.5],
};

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private meshes = new Map<string, GpuMesh>();
  private batches: Batch[] = [];
  private instanceBuf: WebGLBuffer;
  private instanceData = new Float32Array(0);
  private atlas: WebGLTexture;
  private viewProj = mat4();
  private proj = mat4();
  private view = mat4();
  private eye = new Float32Array(3);
  private model: ModelDef<never> | null = null;
  private depthProg: WebGLProgram;
  private uDepthVP: WebGLUniformLocation | null;
  private shadowTex: WebGLTexture;
  private shadowFb: WebGLFramebuffer;
  private lightVP = mat4();
  private lightView = mat4();
  private lightProj = mat4();
  /** Scene extent, measured on the first frame: centre, radius and the lowest point. */
  private extent: { cx: number; cy: number; cz: number; r: number; floor: number } | null = null;
  private floorBatch: Batch | null = null;
  triangles = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, premultipliedAlpha: false, powerPreference: 'default', preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.prog = this.program(VS, FS);
    for (const name of ['uViewProj', 'uEye', 'uOutline', 'uColor', 'uMetal', 'uRough', 'uKind', 'uLook', 'uPaper', 'uLine', 'uAtlas', 'uLightVP', 'uShadow', 'uShadows', 'uBg', 'uFloorC', 'uGrain']) this.u[name] = gl.getUniformLocation(this.prog, name);
    this.depthProg = this.program(DEPTH_VS, DEPTH_FS);
    this.uDepthVP = gl.getUniformLocation(this.depthProg, 'uLightVP');
    this.shadowTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.shadowFb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.instanceBuf = gl.createBuffer()!;
    this.atlas = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawAtlas());
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
  }

  private program(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    return p;
  }

  private upload(key: string, data: MeshData): GpuMesh {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const n = data.positions.length / 3;
    const inter = new Float32Array(n * 8);
    for (let k = 0; k < n; k++) {
      inter.set(data.positions.subarray(k * 3, k * 3 + 3), k * 8);
      inter.set(data.normals.subarray(k * 3, k * 3 + 3), k * 8 + 3);
      inter[k * 8 + 6] = data.uvs[k * 2]!;
      inter[k * 8 + 7] = data.uvs[k * 2 + 1]!;
    }
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, inter, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    const small = n < 65536;
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, small ? new Uint16Array(data.indices) : data.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const m = { vao, count: data.indices.length, type: small ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT, vbo, ibo };
    this.meshes.set(key, m);
    return m;
  }

  /** Prepare a model: build (or fetch cached) meshes, upload them, and group nodes into batches. */
  setModel<S>(model: ModelDef<S>): void {
    const gl = this.gl;
    this.model = model as unknown as ModelDef<never>;
    const groups = new Map<string, { mesh: string; material: MaterialName; nodes: number[] }>();
    model.nodes.forEach((node, i) => {
      for (const p of node.parts) {
        const k = `${p.mesh}|${p.material}`;
        let g = groups.get(k);
        if (!g) groups.set(k, (g = { mesh: p.mesh, material: p.material, nodes: [] }));
        g.nodes.push(i);
      }
    });
    // Opaque parts first, decals last (they sit just above surfaces).
    const list = [...groups.values()].sort((a, b) => MATERIALS[a.material].kind - MATERIALS[b.material].kind);
    let first = 0;
    this.triangles = 0;
    this.batches = list.map((g) => {
      const key = `${model.key}:${g.mesh}`;
      const build = model.meshes[g.mesh];
      if (!build) throw new Error(`${model.key}: no mesh "${g.mesh}"`);
      const data = getMesh(key, build);
      const gm = this.meshes.get(key) ?? this.upload(key, data);
      this.triangles += (gm.count / 3) * g.nodes.length;
      // A VAO per batch: the mesh's attributes plus instance attributes at this batch's offset.
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, gm.vbo);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gm.ibo);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
      for (let a = 0; a < 5; a++) {
        gl.enableVertexAttribArray(3 + a);
        gl.vertexAttribPointer(3 + a, 4, gl.FLOAT, false, FLOATS_PER_INSTANCE * 4, first * FLOATS_PER_INSTANCE * 4 + a * 16);
        gl.vertexAttribDivisor(3 + a, 1);
      }
      gl.bindVertexArray(null);
      const b: Batch = { mesh: key, material: MATERIALS[g.material], nodes: g.nodes, first, vao, count: gm.count, type: gm.type, bounds: data.bounds };
      first += g.nodes.length;
      return b;
    });
    // The floor: one more instance, a unit square scaled to the scene each frame.
    const floorKey = '__floor';
    const floorMesh = this.meshes.get(floorKey) ?? this.upload(floorKey, FLOOR);
    const fvao = gl.createVertexArray()!;
    gl.bindVertexArray(fvao);
    gl.bindBuffer(gl.ARRAY_BUFFER, floorMesh.vbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, floorMesh.ibo);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
    for (let a = 0; a < 5; a++) {
      gl.enableVertexAttribArray(3 + a);
      gl.vertexAttribPointer(3 + a, 4, gl.FLOAT, false, FLOATS_PER_INSTANCE * 4, first * FLOATS_PER_INSTANCE * 4 + a * 16);
      gl.vertexAttribDivisor(3 + a, 1);
    }
    gl.bindVertexArray(null);
    this.floorBatch = { mesh: floorKey, material: MATERIALS.paper, nodes: [], first, vao: fvao, count: floorMesh.count, type: floorMesh.type, bounds: [0, 0, 0, 1] };
    this.extent = null;
    first += 1;
    this.instanceData = new Float32Array(first * FLOATS_PER_INSTANCE);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.byteLength, gl.DYNAMIC_DRAW);
  }

  /**
   * Draw a frame. `matrices` holds 16 floats per node; `tints` 4 per node (rgb, strength).
   * `cam` gives eye and target in world space.
   */
  render(matrices: Float32Array, tints: Float32Array, eye: ArrayLike<number>, target: ArrayLike<number>, fov: number, look: Look, pal: Palette, viewId: string, scale: number): void {
    const gl = this.gl;
    const t0 = performance.now();
    const w = this.canvas.width, h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.clearColor(pal.bg[0], pal.bg[1], pal.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!this.model) return;
    const r = Math.hypot(eye[0]! - target[0]!, eye[1]! - target[1]!, eye[2]! - target[2]!);
    perspective(this.proj, fov, w / Math.max(1, h), Math.max(0.05, r * 0.02), r * 20);
    lookAt(this.view, eye, target);
    multiply(this.viewProj, this.proj, this.view);
    this.eye[0] = eye[0]!; this.eye[1] = eye[1]!; this.eye[2] = eye[2]!;

    // Fill the instance buffer: matrix then tint, batch by batch.
    const data = this.instanceData;
    let o = 0, instances = 0;
    for (const b of this.batches) {
      for (const i of b.nodes) {
        // A plain loop: subarray() would allocate a view per instance per frame.
        for (let k = 0, src = i * 16; k < 16; k++) data[o + k] = matrices[src + k]!;
        data[o + 16] = tints[i * 4]!;
        data[o + 17] = tints[i * 4 + 1]!;
        data[o + 18] = tints[i * 4 + 2]!;
        data[o + 19] = tints[i * 4 + 3]!;
        o += FLOATS_PER_INSTANCE;
        instances++;
      }
    }
    if (!this.extent) this.measure(matrices);
    const ex = this.extent!;
    // Floor instance: a square of side 6r under the scene.
    const fs = ex.r * 3;
    data.fill(0, o, o + FLOATS_PER_INSTANCE);
    data[o] = fs; data[o + 5] = 1; data[o + 10] = fs; data[o + 15] = 1;
    data[o + 12] = ex.cx; data[o + 13] = ex.floor; data[o + 14] = ex.cz;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);

    let calls = 0;
    const shadows = look === 'brass';
    if (shadows) {
      // Depth from the light into the shadow map (opaque parts only).
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFb);
      gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.depthProg);
      gl.uniformMatrix4fv(this.uDepthVP, false, this.lightVP);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(2, 3);
      gl.disable(gl.CULL_FACE);
      for (const b of this.batches) {
        if (b.material.kind !== 0) continue;
        gl.bindVertexArray(b.vao);
        gl.drawElementsInstanced(gl.TRIANGLES, b.count, b.type, 0, b.nodes.length);
        calls++;
      }
      gl.enable(gl.CULL_FACE);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
    }

    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.uLightVP!, false, this.lightVP);
    gl.uniform1i(this.u.uShadows!, shadows ? 1 : 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.uniform1i(this.u.uShadow!, 1);
    gl.uniform3f(this.u.uBg!, pal.bg[0], pal.bg[1], pal.bg[2]);
    gl.uniform3f(this.u.uFloorC!, ex.cx, ex.cz, fs);
    gl.uniformMatrix4fv(this.u.uViewProj!, false, this.viewProj);
    gl.uniform3fv(this.u.uEye!, this.eye);
    gl.uniform3f(this.u.uPaper!, pal.paper[0], pal.paper[1], pal.paper[2]);
    gl.uniform3f(this.u.uLine!, pal.line[0], pal.line[1], pal.line[2]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.uniform1i(this.u.uAtlas!, 0);
    const pass = (lookId: number, outline: number) => {
      gl.uniform1i(this.u.uLook!, lookId);
      gl.uniform1f(this.u.uOutline!, outline);
      for (const b of this.batches) {
        if (lookId === 2 && b.material.kind === 1) continue;
        gl.uniform3fv(this.u.uColor!, b.material.color);
        gl.uniform1f(this.u.uMetal!, b.material.metal);
        gl.uniform1f(this.u.uRough!, b.material.rough);
        gl.uniform1i(this.u.uKind!, b.material.kind);
        gl.uniform1f(this.u.uGrain!, b.material.grain ?? 0);
        gl.bindVertexArray(b.vao);
        gl.drawElementsInstanced(gl.TRIANGLES, b.count, b.type, 0, b.nodes.length);
        calls++;
      }
    };
    if (look === 'drawing') {
      gl.cullFace(gl.FRONT);
      pass(2, 0.0022);
      gl.cullFace(gl.BACK);
      pass(1, 0);
    } else {
      gl.cullFace(gl.BACK);
      pass(0, 0);
      // The floor last: it is behind everything, and only covers the background.
      const fb = this.floorBatch!;
      gl.uniform1i(this.u.uKind!, 2);
      gl.bindVertexArray(fb.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, fb.count, fb.type, 0, 1);
      calls++;
    }
    gl.bindVertexArray(null);
    const v = (stats.views[viewId] ??= { drawCalls: 0, instances: 0, triangles: 0, frames: 0, cpuMs: 0, scale: 1 });
    v.drawCalls = calls;
    v.instances = instances;
    v.triangles = this.triangles;
    v.frames++;
    v.cpuMs = performance.now() - t0;
    v.scale = scale;
  }

  /** Measure the scene (bounding spheres of every part as posed now) and aim the shadow camera at it. */
  private measure(matrices: Float32Array): void {
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const b of this.batches) {
      const [bx, by, bz, br] = b.bounds;
      for (const i of b.nodes) {
        const o = i * 16;
        const sc = Math.hypot(matrices[o]!, matrices[o + 1]!, matrices[o + 2]!);
        if (sc < 1e-6) continue;
        const x = matrices[o]! * bx + matrices[o + 4]! * by + matrices[o + 8]! * bz + matrices[o + 12]!;
        const y = matrices[o + 1]! * bx + matrices[o + 5]! * by + matrices[o + 9]! * bz + matrices[o + 13]!;
        const z = matrices[o + 2]! * bx + matrices[o + 6]! * by + matrices[o + 10]! * bz + matrices[o + 14]!;
        const r = br * sc;
        lo = [Math.min(lo[0]!, x - r), Math.min(lo[1]!, y - r), Math.min(lo[2]!, z - r)];
        hi = [Math.max(hi[0]!, x + r), Math.max(hi[1]!, y + r), Math.max(hi[2]!, z + r)];
      }
    }
    if (!Number.isFinite(lo[0]!)) lo = hi = [0, 0, 0];
    const cx = (lo[0]! + hi[0]!) / 2, cy = (lo[1]! + hi[1]!) / 2, cz = (lo[2]! + hi[2]!) / 2;
    const r = Math.max(0.5, Math.hypot(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!) / 2);
    // Bounding spheres overestimate; nudge the floor a little below the lowest true extent.
    this.extent = { cx, cy, cz, r, floor: this.lowest(matrices) - 0.02 };
    const L = [0.45, 1.0, 0.55], ll = Math.hypot(L[0]!, L[1]!, L[2]!);
    const eye = [cx + (L[0]! / ll) * r * 3, cy + (L[1]! / ll) * r * 3, cz + (L[2]! / ll) * r * 3];
    lookAt(this.lightView, eye, [cx, cy, cz]);
    ortho(this.lightProj, -r * 1.15, r * 1.15, -r * 1.15, r * 1.15, r * 0.5, r * 6);
    multiply(this.lightVP, this.lightProj, this.lightView);
  }

  /** Lowest y of any vertex as posed now (meshes are cached on the CPU, so this is exact). */
  private lowest(matrices: Float32Array): number {
    let min = Infinity;
    if (!this.model) return 0;
    const model = this.model;
    model.nodes.forEach((node, i) => {
      const o = i * 16;
      for (const p of node.parts) {
        const build = model.meshes[p.mesh];
        if (!build) continue;
        const mesh = getMesh(`${model.key}:${p.mesh}`, build);
        const pos = mesh.positions;
        for (let k = 0; k < pos.length; k += 3) {
          const y = matrices[o + 1]! * pos[k]! + matrices[o + 5]! * pos[k + 1]! + matrices[o + 9]! * pos[k + 2]! + matrices[o + 13]!;
          if (y < min) min = y;
        }
      }
    });
    return Number.isFinite(min) ? min : 0;
  }

  /** The view-projection matrix of the last frame (for projecting labels and picking). */
  get lastViewProj(): Float32Array {
    return this.viewProj;
  }

  dispose(): void {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

/** Parse a CSS colour (#rgb, #rrggbb or rgb()) into linear-ish 0–1 floats for clear colours. */
export function cssColor(c: string, fallback: [number, number, number]): [number, number, number] {
  c = c.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) {
    const n = parseInt(m[1]!, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  m = /^#([0-9a-f]{3})$/i.exec(c);
  if (m) return [...m[1]!].map((h) => parseInt(h + h, 16) / 255) as [number, number, number];
  const r = /rgba?\(([^)]+)\)/.exec(c);
  if (r) {
    const [a, b, d] = r[1]!.split(/[ ,]+/).map(Number);
    return [a! / 255, b! / 255, d! / 255];
  }
  return fallback;
}
