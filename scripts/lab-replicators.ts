import { writeFileSync } from 'node:fs';
import { createFilledTensor } from '../src/lib/math/factories';
import { deriveTypeLinksMatrix } from '../src/lib/config/bond-limits';
import { Simulation } from '../src/lib/simulation/simulation';
import { PhysicModelSpring } from '../src/lib/physics/spring';
import { createDummyDrawer } from '../src/lib/drawer/dummy';
import { createAtom } from '../src/lib/utils/functions';
import type { TypesConfig, WorldConfig } from '../src/lib/config/types';
import type { AtomInterface } from '../src/lib/simulation/types/atomic';

function world(size: number, n: number): WorldConfig {
  return {
    VIEW_MODE: '2d',
    PHYSIC_MODEL: 'spring',
    ATOM_RADIUS: 5,
    MAX_INTERACTION_RADIUS: 80,
    MAX_LINK_RADIUS: 50,
    MAX_FORCE: 0.15,
    GRAVITY_FORCE_MULTIPLIER: 0.6,
    WORLD_GRAVITY: 0,
    LINK_FORCE_MULTIPLIER: 0.0025,
    BOUNCE_FORCE_MULTIPLIER: 0.02,
    BOUNDS_FORCE_MULTIPLIER: 0.01,
    INERTIAL_MULTIPLIER: 0.96,
    SPEED: 5,
    PLAYBACK_SPEED: 1,
    SIMPLIFIED_VIEW_MODE: false,
    TEMPERATURE_MULTIPLIER: 0.08,
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

function types(partial: {
  names: string[];
  colors: number[][];
  gravity: number[][];
  links: number[];
  weights: number[][];
  transformation?: Record<number, Record<number, number>>;
  decays?: TypesConfig['DECAYS'];
}): TypesConfig {
  const n = partial.names.length;
  const ones = (v = 1) => Array(n).fill(v);
  const zeroM = () => Array.from({ length: n }, () => ones(0));
  return {
    COLORS: partial.colors as TypesConfig['COLORS'],
    NAMES: partial.names,
    FREQUENCIES: ones(1),
    RADIUS: ones(1),
    MASS: ones(1),
    GRAVITY: partial.gravity,
    LINK_BIAS: zeroM(),
    LINKS: partial.links,
    TYPE_LINK_WEIGHTS: partial.weights,
    TYPE_LINKS: deriveTypeLinksMatrix(partial.links, partial.weights),
    BOND_PREFERENCE: zeroM(),
    LINK_LENGTH: ones(0.7),
    LINK_STIFFNESS: ones(1),
    BOND_PREFERENCE_FACTOR: createFilledTensor(n, n, n, 1),
    LINK_STRENGTH_FACTOR: createFilledTensor(n, n, n, 1),
    TRANSFORMATION: partial.transformation ?? {},
    DECAYS: partial.decays ?? {},
  };
}

function scatter(count: number, type: number, size: number): AtomInterface[] {
  const atoms: AtomInterface[] = [];
  for (let i = 0; i < count; ++i) {
    atoms.push(createAtom(type, [Math.random() * size, Math.random() * size]));
  }
  return atoms;
}

function typeCounts(sim: Simulation, n: number): number[] {
  const c = Array(n).fill(0);
  for (const a of sim.atoms) c[a.type]++;
  return c;
}

function livingClusters(sim: Simulation, living: Set<number>) {
  const seen = new Set<number>();
  const sizes: number[] = [];
  const pairHist: Record<string, number> = {};
  let auBonds = 0;
  let sameBonds = 0;

  for (const link of sim.links) {
    const a = link.lhs.type;
    const b = link.rhs.type;
    if (!living.has(a) || !living.has(b)) continue;
    if (a === b) sameBonds++;
    else auBonds++;
  }

  for (const atom of sim.atoms) {
    if (!living.has(atom.type) || seen.has(atom.id)) continue;
    const stack = [atom];
    seen.add(atom.id);
    const mix: Record<number, number> = {};
    let size = 0;
    while (stack.length) {
      const cur = stack.pop()!;
      if (!living.has(cur.type)) continue;
      size++;
      mix[cur.type] = (mix[cur.type] ?? 0) + 1;
      const storage = cur.bonds.getStorage();
      for (const key in storage) {
        const nb = storage[key];
        if (!seen.has(nb.id) && living.has(nb.type)) {
          seen.add(nb.id);
          stack.push(nb);
        }
      }
    }
    if (size >= 2) {
      sizes.push(size);
      const key = Object.keys(mix).sort().map((t) => `${t}:${mix[Number(t)]}`).join('+');
      pairHist[key] = (pairHist[key] ?? 0) + 1;
    }
  }

  sizes.sort((a, b) => a - b);
  return {
    clusters: sizes.length,
    clustered: sizes.reduce((a, b) => a + b, 0),
    dimers: sizes.filter((s) => s === 2).length,
    trimers: sizes.filter((s) => s === 3).length,
    tetramers: sizes.filter((s) => s === 4).length,
    bigger: sizes.filter((s) => s > 4).length,
    max: sizes[sizes.length - 1] ?? 0,
    sameBonds,
    heteroBonds: auBonds,
    mix: pairHist,
  };
}

function run(opts: {
  label: string;
  typesConfig: TypesConfig;
  food: number;
  seeds: number[];
  ticks: number;
  size?: number;
  points?: number[];
}) {
  const size = opts.size ?? 1600;
  const n = opts.typesConfig.NAMES.length;
  const living = new Set(Array.from({ length: n - 1 }, (_, i) => i + 1));
  const worldConfig = world(size, opts.food + opts.seeds.reduce((a, b) => a + b, 0));
  const sim = new Simulation({
    viewMode: '2d',
    worldConfig,
    typesConfig: opts.typesConfig,
    physicModel: new PhysicModelSpring(worldConfig, opts.typesConfig),
    atomsFactory: () => {
      const atoms = scatter(opts.food, 0, size);
      for (let t = 0; t < opts.seeds.length; ++t) {
        atoms.push(...scatter(opts.seeds[t], t + 1, size));
      }
      return atoms;
    },
    drawer: createDummyDrawer(),
  });
  const interact = (sim as unknown as { interact: () => void }).interact.bind(sim);
  const snap = (t: number) => {
    const c = typeCounts(sim, n);
    const o = livingClusters(sim, living);
    const mix = Object.entries(o.mix)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => `${k}×${v}`)
      .join(', ');
    return (
      `t=${t} types=[${c}] dimers=${o.dimers} tri=${o.trimers} tet=${o.tetramers} ` +
      `big=${o.bigger} max=${o.max} clustered=${o.clustered} ` +
      `sameBonds=${o.sameBonds} heteroBonds=${o.heteroBonds}` +
      (mix ? ` mix={${mix}}` : '')
    );
  };
  const points = opts.points ?? [200, 600, 1200];
  const rows = [snap(0)];
  let last = 0;
  for (const t of points.filter((p) => p <= opts.ticks)) {
    for (let i = last; i < t; i++) interact();
    last = t;
    rows.push(snap(t));
  }
  if (last < opts.ticks) {
    for (let i = last; i < opts.ticks; i++) interact();
    rows.push(snap(opts.ticks));
  }
  console.log(`\n=== ${opts.label} ===`);
  console.log('  ' + rows.join('\n  '));
}

const dimer = types({
  names: ['Food', 'Rep'],
  colors: [[180, 180, 190], [51, 209, 122]],
  gravity: [
    [0, -2],
    [12, 6],
  ],
  links: [1, 3],
  weights: [
    [2, 1],
    [1, 2],
  ],
  transformation: { 0: { 1: 1 } },
  decays: {
    1: { halfLife: 90, to: 0, secondary: null, stabilizers: [1] },
  },
});

const au = types({
  names: ['Food', 'A', 'U'],
  colors: [[180, 180, 190], [230, 80, 90], [70, 140, 230]],
  gravity: [
    [0, -2, -2],
    [12, -6, 10],
    [12, 10, -6],
  ],
  links: [1, 3, 3],
  weights: [
    [2, 1, 1],
    [1, 4, 2],
    [1, 2, 4],
  ],
  transformation: { 0: { 1: 2, 2: 1 } },
  decays: {
    1: { halfLife: 90, to: 0, secondary: null, stabilizers: [2] },
    2: { halfLife: 90, to: 0, secondary: null, stabilizers: [1] },
  },
});

const mutate = types({
  names: ['Food', 'Weak', 'Strong'],
  colors: [[180, 180, 190], [80, 200, 120], [40, 230, 80]],
  gravity: [
    [0, -2, -2],
    [10, 5, -4],
    [14, -4, 6],
  ],
  links: [1, 3, 3],
  weights: [
    [2, 1, 1],
    [1, 2, 4],
    [1, 4, 2],
  ],
  transformation: { 0: { 1: 1, 2: 2 } },
  decays: {
    1: { halfLife: 70, to: 2, secondary: null, stabilizers: [1] },
    2: { halfLife: 110, to: 0, secondary: null, stabilizers: [2] },
  },
});

const soup = types({
  names: ['Food', 'Rep'],
  colors: [[180, 180, 190], [51, 209, 122]],
  gravity: [
    [0, -2],
    [12, 6],
  ],
  links: [1, 3],
  weights: [
    [2, 1],
    [1, 2],
  ],
  transformation: { 0: { 1: 1 } },
  decays: {
    0: { halfLife: 25000, to: 1, secondary: null, stabilizers: [] },
    1: { halfLife: 90, to: 0, secondary: null, stabilizers: [1] },
  },
});

const soupNoCopy = types({
  names: ['Food', 'Rep'],
  colors: [[180, 180, 190], [51, 209, 122]],
  gravity: [
    [0, -2],
    [12, 6],
  ],
  links: [1, 3],
  weights: [
    [2, 1],
    [1, 2],
  ],
  transformation: {},
  decays: {
    0: { halfLife: 25000, to: 1, secondary: null, stabilizers: [] },
    1: { halfLife: 90, to: 0, secondary: null, stabilizers: [1] },
  },
});

const harsh = types({
  names: ['Food', 'Weak', 'Strong'],
  colors: [[180, 180, 190], [80, 200, 120], [40, 230, 80]],
  gravity: [
    [0, -1, -3],
    [6, 3, -5],
    [16, -5, 6],
  ],
  links: [1, 3, 3],
  weights: [
    [2, 1, 1],
    [1, 2, 4],
    [1, 4, 2],
  ],
  transformation: { 0: { 1: 1, 2: 2 } },
  decays: {
    1: { halfLife: 35, to: 2, secondary: null, stabilizers: [1] },
    2: { halfLife: 160, to: 0, secondary: null, stabilizers: [2] },
  },
});

function worldJson(atoms = 2000, playback = 1) {
  return {
    VIEW_MODE: '2d',
    PHYSIC_MODEL: 'spring',
    ATOM_RADIUS: 5,
    MAX_INTERACTION_RADIUS: 80,
    MAX_LINK_RADIUS: 50,
    MAX_FORCE: 0.15,
    GRAVITY_FORCE_MULTIPLIER: 0.6,
    WORLD_GRAVITY: 0,
    LINK_FORCE_MULTIPLIER: 0.0025,
    BOUNCE_FORCE_MULTIPLIER: 0.02,
    BOUNDS_FORCE_MULTIPLIER: 0.01,
    INERTIAL_MULTIPLIER: 0.96,
    SPEED: 5,
    PLAYBACK_SPEED: playback,
    SIMPLIFIED_VIEW_MODE: false,
    TEMPERATURE_MULTIPLIER: 0.08,
    DECAY_SPLITS_VELOCITY: 0.3,
    CONFIG_2D: {
      BOUNDS: { MIN_POSITION: [0, 0], MAX_POSITION: [2500, 2500] },
      INITIAL: { ATOMS_COUNT: atoms, MIN_POSITION: [0, 0], MAX_POSITION: [2500, 2500] },
    },
    CONFIG_3D: {
      BOUNDS: { MIN_POSITION: [0, 0, 0], MAX_POSITION: [700, 700, 700] },
      INITIAL: { ATOMS_COUNT: 1000, MIN_POSITION: [0, 0, 0], MAX_POSITION: [700, 700, 700] },
    },
  };
}

function pack(typesConfig: TypesConfig, frequencies: number[], playback = 1) {
  return {
    worldConfig: worldJson(2000, playback),
    typesConfig: { ...typesConfig, FREQUENCIES: frequencies },
    typesSymmetricConfig: {
      GRAVITY_MATRIX_SYMMETRIC: false,
      LINK_BIAS_MATRIX_SYMMETRIC: true,
      LINK_TYPE_MATRIX_SYMMETRIC: true,
      LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC: true,
      BOND_PREFERENCE_MATRIX_SYMMETRIC: true,
      BOND_PREFERENCE_FACTOR_MATRIX_SYMMETRIC: true,
      LINK_STRENGTH_FACTOR_MATRIX_SYMMETRIC: true,
    },
  };
}

const mode = process.argv[2] ?? 'main';

if (mode === 'main') {
  run({ label: 'dimer seed=24', typesConfig: dimer, food: 900, seeds: [24], ticks: 1200 });
  run({ label: 'dimer seed=0', typesConfig: dimer, food: 924, seeds: [], ticks: 1200 });
  run({ label: 'AU seed A=12 U=12', typesConfig: au, food: 900, seeds: [12, 12], ticks: 1200 });
  run({ label: 'AU seed A=16 U=0', typesConfig: au, food: 900, seeds: [16, 0], ticks: 1200 });
  run({ label: 'AU seed=0', typesConfig: au, food: 924, seeds: [], ticks: 800 });
  run({
    label: 'mutate Weak=30 Strong=0',
    typesConfig: mutate,
    food: 900,
    seeds: [30, 0],
    ticks: 1800,
    points: [300, 900, 1800],
  });
  run({
    label: 'soup Food→Rep rare + copy seed=0',
    typesConfig: soup,
    food: 1000,
    seeds: [],
    ticks: 2500,
    points: [400, 1200, 2500],
  });
  run({
    label: 'soup no-copy control seed=0',
    typesConfig: soupNoCopy,
    food: 1000,
    seeds: [],
    ticks: 2500,
    points: [400, 1200, 2500],
  });
}

if (mode === 'dump') {
  const out = [
    ['data/interesting/replicator-dimers.json', pack(dimer, [1, 0.03])],
    ['data/interesting/replicator-pairs.json', pack(au, [1, 0.02, 0.02])],
    ['data/interesting/replicator-strains.json', pack(harsh, [1, 0.03, 0])],
    ['data/interesting/replicator-soup.json', pack(soup, [1, 0], 2)],
  ] as const;
  for (const [path, data] of out) {
    writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
    console.log('wrote', path);
  }
}

if (mode === 'evolve') {
  run({
    label: 'harsh Weak=40 Strong=0',
    typesConfig: harsh,
    food: 900,
    seeds: [40, 0],
    ticks: 2500,
    points: [400, 1200, 2500],
  });
  run({
    label: 'harsh Weak=40 Strong=4 invasion',
    typesConfig: harsh,
    food: 900,
    seeds: [40, 4],
    ticks: 2500,
    points: [400, 1200, 2500],
  });
  run({ label: 'AU seed A=0 U=16', typesConfig: au, food: 900, seeds: [0, 16], ticks: 1200 });
}
