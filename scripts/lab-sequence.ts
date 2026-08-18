import { writeFileSync } from 'fs';
import { createFilledTensor } from '../src/lib/math/factories';
import { deriveTypeLinksMatrix } from '../src/lib/config/bond-limits';
import { Simulation } from '../src/lib/simulation/simulation';
import { PhysicModelSpring } from '../src/lib/physics/spring';
import { createDummyDrawer } from '../src/lib/drawer/dummy';
import { createAtom } from '../src/lib/utils/functions';
import type { TypesConfig, WorldConfig } from '../src/lib/config/types';
import type { AtomInterface } from '../src/lib/simulation/types/atomic';

const F = 0;
const A = 1;
const B = 2;
const a = 3;
const b = 4;
const LETTER = ['F', 'A', 'B', 'a', 'b'];
const ORIG = new Set([A, B]);
const PRIM = new Set([a, b]);

function zeros(n: number): number[][] {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

function setBoth(t: number[][][], agent: number, x: number, y: number, v: number) {
  t[agent][x][y] = v;
  t[agent][y][x] = v;
}

function isPair(t0: number, t1: number): boolean {
  const i = Math.min(t0, t1);
  const j = Math.max(t0, t1);
  return (i === A && j === b) || (i === B && j === a);
}

function isBackbone(t0: number, t1: number): boolean {
  return (ORIG.has(t0) && ORIG.has(t1)) || (PRIM.has(t0) && PRIM.has(t1));
}

function world(size: number, n: number): WorldConfig {
  return {
    VIEW_MODE: '2d',
    PHYSIC_MODEL: 'spring',
    ATOM_RADIUS: 5,
    MAX_INTERACTION_RADIUS: 90,
    MAX_LINK_RADIUS: 48,
    MAX_FORCE: 0.15,
    GRAVITY_FORCE_MULTIPLIER: 0.6,
    WORLD_GRAVITY: 0,
    LINK_FORCE_MULTIPLIER: 0.003,
    BOUNCE_FORCE_MULTIPLIER: 0.02,
    BOUNDS_FORCE_MULTIPLIER: 0.01,
    INERTIAL_MULTIPLIER: 0.96,
    SPEED: 5,
    PLAYBACK_SPEED: 1,
    SIMPLIFIED_VIEW_MODE: false,
    TEMPERATURE_MULTIPLIER: 0.12,
    DECAY_SPLITS_VELOCITY: 0.3,
    TEMPERATURE_FUNCTION: () => 1,
    CONFIG_2D: {
      BOUNDS: { MIN_POSITION: [0, 0], MAX_POSITION: [size, size] },
      INITIAL: { ATOMS_COUNT: n, MIN_POSITION: [0, 0], MAX_POSITION: [size, size] },
    },
    CONFIG_3D: {
      BOUNDS: { MIN_POSITION: [0, 0, 0], MAX_POSITION: [500, 500, 500] },
      INITIAL: { ATOMS_COUNT: 400, MIN_POSITION: [0, 0, 0], MAX_POSITION: [500, 500, 500] },
    },
  };
}

function sequenceTypes(): TypesConfig {
  const n = 5;
  const links = [1, 3, 3, 3, 3];
  const weights = [
    [2, 1, 1, 1, 1],
    [3, 1, 1, 5, 3],
    [3, 1, 1, 3, 5],
    [3, 5, 3, 1, 1],
    [3, 3, 5, 1, 1],
  ];
  const g = zeros(n);
  g[F][A] = 8;
  g[F][B] = 8;
  g[A][b] = -2;
  g[b][A] = -2;
  g[B][a] = -2;
  g[a][B] = -2;
  const f = createFilledTensor(n, n, n, 1);
  const s = createFilledTensor(n, n, n, 1);
  for (const agent of [a, b]) {
    setBoth(s, agent, A, b, 0.5);
    setBoth(s, agent, B, a, 0.5);
  }
  for (const agent of [A, B]) {
    for (const neu of [F, A, B, a, b]) {
      f[agent][A][neu] = Math.max(f[agent][A][neu], 2);
      f[agent][B][neu] = Math.max(f[agent][B][neu], 2);
    }
  }
  for (const agent of [a, b]) {
    for (const neu of [F, A, B, a, b]) {
      f[agent][a][neu] = Math.max(f[agent][a][neu], 2);
      f[agent][b][neu] = Math.max(f[agent][b][neu], 2);
    }
  }
  setBoth(f, A, A, B, 2);
  setBoth(f, B, A, B, 2);
  setBoth(f, a, a, b, 2);
  setBoth(f, b, a, b, 2);
  return {
    COLORS: [
      [190, 190, 200],
      [230, 80, 90],
      [70, 140, 230],
      [255, 160, 70],
      [80, 220, 200],
    ],
    NAMES: ['F', 'A', 'B', 'a', 'b'],
    FREQUENCIES: [1, 0, 0, 0, 0],
    RADIUS: [1, 1, 1, 1, 1],
    MASS: [1, 1, 1, 1, 1],
    GRAVITY: g,
    LINK_BIAS: zeros(n),
    LINKS: links,
    TYPE_LINK_WEIGHTS: weights,
    TYPE_LINKS: deriveTypeLinksMatrix(links, weights),
    BOND_PREFERENCE: [
      [0, 1, 1, 1, 1],
      [1, 4, 4, 0, 5],
      [1, 4, 4, 5, 0],
      [1, 0, 5, 4, 4],
      [1, 5, 0, 4, 4],
    ],
    LINK_LENGTH: [0.7, 0.5, 0.5, 0.5, 0.5],
    LINK_STIFFNESS: [1, 1.4, 1.4, 1.4, 1.4],
    BOND_PREFERENCE_FACTOR: f,
    LINK_STRENGTH_FACTOR: s,
    TRANSFORMATION: { 0: { 1: 4, 2: 3 } },
    DECAYS: {
      3: { halfLife: 110, to: F, secondary: null, stabilizers: [a, b, B] },
      4: { halfLife: 110, to: F, secondary: null, stabilizers: [a, b, A] },
    },
  };
}

function neighbors(atom: AtomInterface): AtomInterface[] {
  return Object.values(atom.bonds.getStorage());
}

function backboneNeighbors(atom: AtomInterface): AtomInterface[] {
  return neighbors(atom).filter((n) => isBackbone(atom.type, n.type));
}

function strands(sim: Simulation, alphabet: Set<number>) {
  const seen = new Set<number>();
  const result: AtomInterface[][] = [];
  for (const atom of sim.atoms) {
    if (!alphabet.has(atom.type) || seen.has(atom.id)) continue;
    const stack = [atom];
    seen.add(atom.id);
    const cluster: AtomInterface[] = [];
    while (stack.length) {
      const cur = stack.pop()!;
      cluster.push(cur);
      for (const nb of backboneNeighbors(cur)) {
        if (alphabet.has(nb.type) && !seen.has(nb.id)) {
          seen.add(nb.id);
          stack.push(nb);
        }
      }
    }
    result.push(cluster);
  }
  return result;
}

function readLinear(cluster: AtomInterface[]): string {
  if (cluster.length === 1) return LETTER[cluster[0].type];
  const ends = cluster.filter((c) => backboneNeighbors(c).length <= 1);
  const start = ends[0] ?? cluster[0];
  const seq: number[] = [];
  let prev: AtomInterface | undefined;
  let cur: AtomInterface | undefined = start;
  const used = new Set<number>();
  while (cur && !used.has(cur.id)) {
    used.add(cur.id);
    seq.push(cur.type);
    const next = backboneNeighbors(cur).find((n) => n !== prev);
    prev = cur;
    cur = next;
  }
  return seq.map((t) => LETTER[t]).join('');
}

function complementWord(word: string): string {
  return [...word].map((ch) => {
    if (ch === 'A') return 'b';
    if (ch === 'B') return 'a';
    if (ch === 'a') return 'B';
    if (ch === 'b') return 'A';
    return ch;
  }).join('');
}

function alignScore(got: string, expect: string): number {
  if (!got || !expect) return 0;
  let best = 0;
  for (const target of [expect, [...expect].reverse().join('')]) {
    for (let shift = -got.length; shift <= target.length; shift++) {
      let hit = 0;
      for (let i = 0; i < got.length; i++) {
        const j = i + shift;
        if (j >= 0 && j < target.length && got[i] === target[j]) hit++;
      }
      best = Math.max(best, hit);
    }
  }
  return best;
}

function isPaired(atom: AtomInterface): boolean {
  return neighbors(atom).some((n) => isPair(atom.type, n.type));
}

function summarize(sim: Simulation, expect: string[]) {
  const c = [0, 0, 0, 0, 0];
  for (const atom of sim.atoms) c[atom.type]++;
  let pairs = 0;
  for (const link of sim.links) {
    if (isPair(link.lhs.type, link.rhs.type)) pairs++;
  }
  const orig = strands(sim, ORIG);
  const prim = strands(sim, PRIM);
  const origWords = orig.map(readLinear).sort((x, y) => y.length - x.length);
  const primWords = prim.map(readLinear).sort((x, y) => y.length - x.length);
  const origLong = orig.filter((s) => s.length >= 4).length;
  const primLong = prim.filter((s) => s.length >= 4).length;
  const origFree = orig.filter((s) => s.length >= 4 && s.every((a) => !isPaired(a))).length;
  const primFree = prim.filter((s) => s.length >= 4 && s.every((a) => !isPaired(a))).length;
  const want = expect[0] ?? '';
  const match = Math.max(0, ...primWords.map((w) => alignScore(w, want)));
  return {
    c,
    pairs,
    origN: orig.length,
    primN: prim.length,
    origLong,
    primLong,
    origFree,
    primFree,
    origMax: origWords[0]?.length ?? 0,
    primMax: primWords[0]?.length ?? 0,
    origTop: origWords.filter((w) => w.length >= 3).slice(0, 6),
    primTop: primWords.filter((w) => w.length >= 3).slice(0, 6),
    match,
    wantLen: want.length,
  };
}

type Built = { atoms: AtomInterface[]; pairs: [number, number][] };

function buildTemplate(seq: number[], x: number, y: number, gap = 16): Built {
  const atoms: AtomInterface[] = [];
  const pairs: [number, number][] = [];
  for (let i = 0; i < seq.length; i++) {
    atoms.push(createAtom(seq[i], [x + i * gap, y]));
    if (i > 0) pairs.push([i - 1, i]);
  }
  return { atoms, pairs };
}

function scatterF(count: number, size: number, yMin?: number, yMax?: number): Built {
  const atoms: AtomInterface[] = [];
  const ymin = yMin ?? 40;
  const ymax = yMax ?? (size - 40);
  for (let i = 0; i < count; i++) {
    atoms.push(createAtom(F, [
      40 + Math.random() * (size - 80),
      ymin + Math.random() * Math.max(10, ymax - ymin),
    ]));
  }
  return { atoms, pairs: [] };
}

function merge(...parts: Built[]): Built {
  const atoms: AtomInterface[] = [];
  const pairs: [number, number][] = [];
  for (const part of parts) {
    const off = atoms.length;
    atoms.push(...part.atoms);
    for (const [i, j] of part.pairs) pairs.push([i + off, j + off]);
  }
  return { atoms, pairs };
}

function run(label: string, seqs: number[][], food: number, ticks: number, size = 1500) {
  const typesConfig = sequenceTypes();
  const parts = seqs.map((seq, i) => buildTemplate(seq, 220 + i * 420, 750, 12));
  parts.push(scatterF(Math.floor(food * 0.6), size, 640, 860));
  parts.push(scatterF(Math.ceil(food * 0.4), size));
  const built = merge(...parts);
  const worldConfig = world(size, built.atoms.length);
  const sim = new Simulation({
    viewMode: '2d',
    worldConfig,
    typesConfig,
    physicModel: new PhysicModelSpring(worldConfig, typesConfig),
    atomsFactory: () => built.atoms,
    drawer: createDummyDrawer(),
  });
  for (const [i, j] of built.pairs) {
    sim.links.create(built.atoms[i], built.atoms[j], 1);
  }
  const interact = (sim as unknown as { interact: () => void }).interact.bind(sim);
  const rows: string[] = [];
  let last = 0;
  const expect = seqs.map((s) => complementWord(s.map((t) => LETTER[t]).join('')));
  const points = [...new Set([0, 400, 1200, 3000, ticks])].filter((p) => p <= ticks).sort((x, y) => x - y);
  for (const t of points) {
    for (let i = last; i < t; i++) interact();
    last = t;
    const s = summarize(sim, expect);
    rows.push(
      `t=${t} types=[${s.c}] pairs=${s.pairs} ` +
      `AB(n=${s.origN},≥4=${s.origLong},free=${s.origFree},max=${s.origMax}) ` +
      `ab(n=${s.primN},≥4=${s.primLong},free=${s.primFree},max=${s.primMax}) ` +
      `match=${s.match}/${s.wantLen} ` +
      `AB:[${s.origTop}] ab:[${s.primTop}]`,
    );
  }
  console.log(`\n=== ${label} ===`);
  console.log('  ' + rows.join('\n  '));
}

const ABAB = [A, B, A, B];
const ABABBABA = [A, B, A, B, B, A, B, A];
const AABBABAA = [A, A, B, B, A, B, A, A];

const mode = process.argv[2] ?? 'main';

if (mode === 'main') {
  run('seed ABAB', [ABAB], 360, 6000);
  run('seed ABABBABA', [ABABBABA], 360, 6000);
  run('no seed', [], 360, 2000);
}

if (mode === 'dump') {
  const typesConfig = sequenceTypes();
  const size = 2500;
  const built = merge(
    buildTemplate(ABABBABA, 400, 1300),
    buildTemplate(AABBABAA, 900, 1000),
    scatterF(1100, size),
  );
  const worldConfig = world(size, built.atoms.length);
  worldConfig.CONFIG_2D.BOUNDS.MAX_POSITION = [size, size];
  worldConfig.CONFIG_2D.INITIAL.ATOMS_COUNT = built.atoms.length;
  worldConfig.CONFIG_2D.INITIAL.MAX_POSITION = [size, size];
  const sim = new Simulation({
    viewMode: '2d',
    worldConfig,
    typesConfig,
    physicModel: new PhysicModelSpring(worldConfig, typesConfig),
    atomsFactory: () => built.atoms,
    drawer: createDummyDrawer(),
  });
  for (const [i, j] of built.pairs) {
    sim.links.create(built.atoms[i], built.atoms[j], 1);
  }
  writeFileSync('data/interesting/replicator-sequence.json', `${JSON.stringify({
    worldConfig: {
      VIEW_MODE: '2d',
      PHYSIC_MODEL: 'spring',
      ATOM_RADIUS: 5,
      MAX_INTERACTION_RADIUS: 90,
      MAX_LINK_RADIUS: 48,
      MAX_FORCE: 0.15,
      GRAVITY_FORCE_MULTIPLIER: 0.6,
      WORLD_GRAVITY: 0,
      LINK_FORCE_MULTIPLIER: 0.003,
      BOUNCE_FORCE_MULTIPLIER: 0.02,
      BOUNDS_FORCE_MULTIPLIER: 0.01,
      INERTIAL_MULTIPLIER: 0.96,
      SPEED: 5,
      PLAYBACK_SPEED: 1,
      SIMPLIFIED_VIEW_MODE: false,
      TEMPERATURE_MULTIPLIER: 0.12,
      DECAY_SPLITS_VELOCITY: 0.3,
      CONFIG_2D: worldConfig.CONFIG_2D,
      CONFIG_3D: {
        BOUNDS: { MIN_POSITION: [0, 0, 0], MAX_POSITION: [700, 700, 700] },
        INITIAL: { ATOMS_COUNT: 800, MIN_POSITION: [0, 0, 0], MAX_POSITION: [700, 700, 700] },
      },
    },
    typesConfig,
    typesSymmetricConfig: {
      GRAVITY_MATRIX_SYMMETRIC: false,
      LINK_BIAS_MATRIX_SYMMETRIC: true,
      LINK_TYPE_MATRIX_SYMMETRIC: true,
      LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC: true,
      BOND_PREFERENCE_MATRIX_SYMMETRIC: true,
      BOND_PREFERENCE_FACTOR_MATRIX_SYMMETRIC: false,
      LINK_STRENGTH_FACTOR_MATRIX_SYMMETRIC: false,
    },
  }, null, 2)}\n`);
  writeFileSync('data/interesting/replicator-sequence-state.json', `${JSON.stringify({
    '2d': {
      atoms: sim.atoms.map((atom) => atom.exportState()),
      links: [...sim.links].map((link) => link.exportState()),
    },
    '3d': { atoms: [], links: [] },
  })}\n`);
  console.log('wrote config+state atoms', sim.atoms.length);
}
