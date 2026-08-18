import { writeFileSync } from 'fs';
import { createFilledTensor } from '../src/lib/math/factories';
import { deriveTypeLinksMatrix } from '../src/lib/config/bond-limits';
import { Simulation } from '../src/lib/simulation/simulation';
import { PhysicModelSpring } from '../src/lib/physics/spring';
import { createDummyDrawer } from '../src/lib/drawer/dummy';
import { createAtom } from '../src/lib/utils/functions';
import type { TypesConfig, WorldConfig } from '../src/lib/config/types';
import type { AtomInterface } from '../src/lib/simulation/types/atomic';

function zeros(n: number): number[][] {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

function world(size: number, n: number, linkR = 55): WorldConfig {
  return {
    VIEW_MODE: '2d',
    PHYSIC_MODEL: 'spring',
    ATOM_RADIUS: 5,
    MAX_INTERACTION_RADIUS: Math.max(90, linkR + 20),
    MAX_LINK_RADIUS: linkR,
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

function makeTypes(partial: {
  names: string[];
  colors: number[][];
  links: number[];
  weights: number[][];
  preference: number[][];
  factor: number[][][];
  strength?: number[][][];
}): TypesConfig {
  const n = partial.names.length;
  const ones = (v = 1) => Array(n).fill(v);
  return {
    COLORS: partial.colors as TypesConfig['COLORS'],
    NAMES: partial.names,
    FREQUENCIES: ones(1),
    RADIUS: ones(1),
    MASS: ones(1),
    GRAVITY: zeros(n),
    LINK_BIAS: zeros(n),
    LINKS: partial.links,
    TYPE_LINK_WEIGHTS: partial.weights,
    TYPE_LINKS: deriveTypeLinksMatrix(partial.links, partial.weights),
    BOND_PREFERENCE: partial.preference,
    LINK_LENGTH: ones(0.7),
    LINK_STIFFNESS: ones(1),
    BOND_PREFERENCE_FACTOR: partial.factor,
    LINK_STRENGTH_FACTOR: partial.strength ?? createFilledTensor(n, n, n, 1),
    TRANSFORMATION: {},
    DECAYS: {},
  };
}

function setBoth(t: number[][][], agent: number, a: number, b: number, v: number) {
  t[agent][a][b] = v;
  t[agent][b][a] = v;
}

type Plan = { atoms: AtomInterface[]; pairs: [number, number][] };

function place(size: number): [number, number] {
  return [50 + Math.random() * (size - 100), 50 + Math.random() * (size - 100)];
}

function around(x: number, y: number, i: number, n: number, gap = 13): [number, number] {
  const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
  return [x + Math.cos(a) * gap, y + Math.sin(a) * gap];
}

function cappedReps(count: number, capsEach: number, size: number): Plan {
  const atoms: AtomInterface[] = [];
  const pairs: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const [x, y] = place(size);
    const ri = atoms.length;
    atoms.push(createAtom(0, [x, y]));
    for (let c = 0; c < capsEach; c++) {
      const ci = atoms.length;
      atoms.push(createAtom(1, around(x, y, c, capsEach)));
      pairs.push([ri, ci]);
    }
  }
  return { atoms, pairs };
}

function repDimers(count: number, size: number): Plan {
  const atoms: AtomInterface[] = [];
  const pairs: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const [x, y] = place(size);
    const a = atoms.length;
    atoms.push(createAtom(0, [x, y]));
    atoms.push(createAtom(0, around(x, y, 0, 1, 12)));
    pairs.push([a, a + 1]);
  }
  return { atoms, pairs };
}

function mergePlans(...plans: Plan[]): Plan {
  const atoms: AtomInterface[] = [];
  const pairs: [number, number][] = [];
  for (const plan of plans) {
    const offset = atoms.length;
    atoms.push(...plan.atoms);
    for (const [i, j] of plan.pairs) pairs.push([i + offset, j + offset]);
  }
  return { atoms, pairs };
}

function abDimers(count: number, size: number): Plan {
  const atoms: AtomInterface[] = [];
  const pairs: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const [x, y] = place(size);
    const a = atoms.length;
    atoms.push(createAtom(0, [x, y]));
    atoms.push(createAtom(1, around(x, y, 0, 1, 12)));
    pairs.push([a, a + 1]);
  }
  return { atoms, pairs };
}

function cappedAB(countA: number, countB: number, capsEach: number, size: number): Plan {
  const atoms: AtomInterface[] = [];
  const pairs: [number, number][] = [];
  for (let t = 0; t < 2; t++) {
    const n = t === 0 ? countA : countB;
    for (let i = 0; i < n; i++) {
      const [x, y] = place(size);
      const ri = atoms.length;
      atoms.push(createAtom(t, [x, y]));
      for (let c = 0; c < capsEach; c++) {
        const ci = atoms.length;
        atoms.push(createAtom(2, around(x, y, c, capsEach)));
        pairs.push([ri, ci]);
      }
    }
  }
  return { atoms, pairs };
}

function metrics(sim: Simulation, living: Set<number>) {
  const bonds: Record<string, number> = {};
  for (const link of sim.links) {
    const i = Math.min(link.lhs.type, link.rhs.type);
    const j = Math.max(link.lhs.type, link.rhs.type);
    const key = `${i}-${j}`;
    bonds[key] = (bonds[key] ?? 0) + 1;
  }
  const seen = new Set<number>();
  let dimers = 0;
  let max = 0;
  let clustered = 0;
  const hist: Record<number, number> = {};
  for (const atom of sim.atoms) {
    if (!living.has(atom.type) || seen.has(atom.id)) continue;
    const stack = [atom];
    seen.add(atom.id);
    let size = 0;
    while (stack.length) {
      const cur = stack.pop()!;
      if (!living.has(cur.type)) continue;
      size++;
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
      clustered += size;
      hist[size] = (hist[size] ?? 0) + 1;
      if (size === 2) dimers++;
      if (size > max) max = size;
    }
  }
  return { bonds, dimers, max, clustered, hist };
}

function run(label: string, typesConfig: TypesConfig, plan: Plan, ticks: number, size = 900, linkR = 55) {
  const worldConfig = world(size, plan.atoms.length, linkR);
  const sim = new Simulation({
    viewMode: '2d',
    worldConfig,
    typesConfig,
    physicModel: new PhysicModelSpring(worldConfig, typesConfig),
    atomsFactory: () => plan.atoms,
    drawer: createDummyDrawer(),
  });
  for (const [i, j] of plan.pairs) {
    const lhs = plan.atoms[i];
    const rhs = plan.atoms[j];
    const w = Math.max(1, Math.round(Math.min(
      typesConfig.TYPE_LINK_WEIGHTS[lhs.type][rhs.type],
      typesConfig.TYPE_LINK_WEIGHTS[rhs.type][lhs.type],
      typesConfig.LINKS[lhs.type],
      typesConfig.LINKS[rhs.type],
    )));
    sim.links.create(lhs, rhs, w);
  }
  const living = new Set(typesConfig.NAMES.map((_, i) => i).filter((i) => typesConfig.NAMES[i] !== 'Cap'));
  const interact = (sim as unknown as { interact: () => void }).interact.bind(sim);
  const points = [0, 100, 500, 1500, ticks].filter((t) => t <= ticks);
  const rows: string[] = [];
  let last = 0;
  for (const t of points) {
    for (let i = last; i < t; i++) interact();
    last = t;
    const m = metrics(sim, living);
    const b = Object.entries(m.bonds).map(([k, v]) => `${k}:${v}`).join(',') || 'none';
    const h = Object.entries(m.hist).sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, v]) => `${k}×${v}`).join(',') || '-';
    rows.push(`t=${t} dimers=${m.dimers} max=${m.max} clustered=${m.clustered} bonds={${b}} hist={${h}}`);
  }
  console.log(`\n=== ${label} ===`);
  console.log('  ' + rows.join('\n  '));
}

function repCap(opts?: { cat?: number; inh?: number; frag?: number }) {
  const cat = opts?.cat ?? 16;
  const inh = opts?.inh ?? 0.3;
  const frag = opts?.frag ?? 1;
  const f = createFilledTensor(2, 2, 2, 1);
  const s = createFilledTensor(2, 2, 2, 1);
  setBoth(f, 0, 0, 0, cat);
  setBoth(f, 1, 0, 0, inh);
  setBoth(f, 0, 0, 1, 3);
  setBoth(s, 0, 0, 0, frag);
  setBoth(s, 0, 0, 1, 0.2);
  return makeTypes({
    names: ['Rep', 'Cap'],
    colors: [[51, 209, 122], [180, 180, 190]],
    links: [4, 1],
    weights: [
      [2, 1],
      [1, 2],
    ],
    preference: [
      [1, 3],
      [3, 0],
    ],
    factor: f,
    strength: s,
  });
}

function abCap() {
  const f = createFilledTensor(3, 3, 3, 1);
  const s = createFilledTensor(3, 3, 3, 1);
  setBoth(f, 0, 0, 1, 16);
  setBoth(f, 1, 0, 1, 16);
  setBoth(f, 2, 0, 1, 0.3);
  setBoth(f, 0, 0, 2, 3);
  setBoth(f, 1, 1, 2, 3);
  setBoth(s, 0, 0, 1, 1);
  setBoth(s, 1, 0, 1, 1);
  setBoth(s, 0, 0, 2, 0.2);
  setBoth(s, 1, 1, 2, 0.2);
  return makeTypes({
    names: ['A', 'B', 'Cap'],
    colors: [[230, 80, 90], [70, 140, 230], [180, 180, 190]],
    links: [4, 4, 1],
    weights: [
      [5, 2, 1],
      [2, 5, 1],
      [1, 1, 2],
    ],
    preference: [
      [0, 1, 3],
      [1, 0, 3],
      [3, 3, 0],
    ],
    factor: f,
    strength: s,
  });
}

const size = 900;
const mode = process.argv[2] ?? 'main';

if (mode === 'main') {
  const grow = repCap({ frag: 1 });
  const none = makeTypes({
    names: ['Rep', 'Cap'],
    colors: [[51, 209, 122], [180, 180, 190]],
    links: [4, 1],
    weights: [[2, 1], [1, 2]],
    preference: [[1, 3], [3, 0]],
    factor: createFilledTensor(2, 2, 2, 1),
  });
  run('no seed, catalysis, no frag', grow, cappedReps(80, 4, size), 3000, size);
  run('seed 20, catalysis, no frag', grow, mergePlans(cappedReps(40, 4, size), repDimers(20, size)), 3000, size);
  run('seed 20, no factors', none, mergePlans(cappedReps(40, 4, size), repDimers(20, size)), 3000, size);
  run('AB no seed', abCap(), cappedAB(40, 40, 4, size), 3000, size);
  run('AB seed 16', abCap(), mergePlans(cappedAB(24, 24, 4, size), abDimers(16, size)), 3000, size);
  run('soup random 90 Rep + 360 Cap', grow, {
    atoms: [...scatterFree(0, 90, size), ...scatterFree(1, 360, size)],
    pairs: [],
  }, 3000, size);
}

function scatterFree(type: number, count: number, size: number): AtomInterface[] {
  return Array.from({ length: count }, () => (
    createAtom(type, [Math.random() * size, Math.random() * size])
  ));
}

if (mode === 'tune') {
  for (const cat of [8, 12, 20]) {
    for (const inh of [0.25, 0.4, 0.6]) {
      for (const frag of [0.15, 0.25, 0.4]) {
        run(`cat=${cat} inh=${inh} frag=${frag} seed16`, repCap({ cat, inh, frag }), mergePlans(
          cappedReps(60, 4, size),
          repDimers(16, size),
        ), 1800);
      }
    }
  }
}

if (mode === 'dump') {
  function pack(typesConfig: TypesConfig, frequencies: number[], atoms = 2000) {
    return {
      worldConfig: {
        VIEW_MODE: '2d',
        PHYSIC_MODEL: 'spring',
        ATOM_RADIUS: 5,
        MAX_INTERACTION_RADIUS: 90,
        MAX_LINK_RADIUS: 55,
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
        TEMPERATURE_MULTIPLIER: 0.12,
        DECAY_SPLITS_VELOCITY: 0.3,
        CONFIG_2D: {
          BOUNDS: { MIN_POSITION: [0, 0], MAX_POSITION: [2500, 2500] },
          INITIAL: { ATOMS_COUNT: atoms, MIN_POSITION: [0, 0], MAX_POSITION: [2500, 2500] },
        },
        CONFIG_3D: {
          BOUNDS: { MIN_POSITION: [0, 0, 0], MAX_POSITION: [700, 700, 700] },
          INITIAL: { ATOMS_COUNT: 1000, MIN_POSITION: [0, 0, 0], MAX_POSITION: [700, 700, 700] },
        },
      },
      typesConfig: { ...typesConfig, FREQUENCIES: frequencies },
      typesSymmetricConfig: {
        GRAVITY_MATRIX_SYMMETRIC: true,
        LINK_BIAS_MATRIX_SYMMETRIC: true,
        LINK_TYPE_MATRIX_SYMMETRIC: true,
        LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC: true,
        BOND_PREFERENCE_MATRIX_SYMMETRIC: true,
        BOND_PREFERENCE_FACTOR_MATRIX_SYMMETRIC: false,
        LINK_STRENGTH_FACTOR_MATRIX_SYMMETRIC: false,
      },
    };
  }
  const out = [
    ['data/interesting/replicator-bonds.json', pack(repCap(), [1, 4])],
    ['data/interesting/replicator-pairs.json', pack(abCap(), [1, 1, 4])],
  ] as const;
  for (const [path, data] of out) {
    writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
    console.log('wrote', path);
  }
}
