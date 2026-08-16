import { createDefaultTypesConfig } from '../src/lib/config/atom-types';
import { createBaseWorldConfig } from '../src/lib/config/world';
import { create2dRandomDistribution } from '../src/lib/config/atoms';
import { Simulation } from '../src/lib/simulation/simulation';
import { PhysicModelSpring } from '../src/lib/physics/spring';
import { createDummyDrawer } from '../src/lib/drawer/dummy';
import type { TypesConfig, WorldConfig } from '../src/lib/config/types';
import type { AtomInterface } from '../src/lib/simulation/types/atomic';

type SimPrivate = {
  _atoms: AtomInterface[];
  _links: Iterable<unknown>;
  interactionManager: {
    moveAtom: (a: AtomInterface) => void;
    interactAtoms: (a: AtomInterface, b: AtomInterface) => void;
    interactLink: (link: unknown) => void;
    handleTime: () => void;
  };
  spatialGridManager: {
    updateAtomCell: (a: AtomInterface) => void;
    handleAtom: (a: AtomInterface, cb: (lhs: AtomInterface, rhs: AtomInterface) => void) => void;
  };
  summaryManager: {
    noticeAtom: (a: AtomInterface, w: WorldConfig) => void;
    noticeLink: (link: unknown, w: WorldConfig) => void;
  };
  applyPendingTypeChanges: () => void;
  handleDecays: () => void;
  removeDeletedAtoms: () => void;
  config: { worldConfig: WorldConfig };
  interact: () => void;
};

const ticks = Number(process.env.BENCH_TICKS ?? 200);
const atomsCount = Number(process.env.BENCH_ATOMS ?? 2000);

function makeSim(
  patch?: (types: TypesConfig, world: WorldConfig) => void,
): Simulation {
  const worldConfig = createBaseWorldConfig();
  worldConfig.VIEW_MODE = '2d';
  worldConfig.PHYSIC_MODEL = 'spring';
  worldConfig.PLAYBACK_SPEED = 1;
  worldConfig.CONFIG_2D.INITIAL.ATOMS_COUNT = atomsCount;
  const typesConfig = createDefaultTypesConfig();
  patch?.(typesConfig, worldConfig);
  return new Simulation({
    viewMode: '2d',
    worldConfig,
    typesConfig,
    physicModel: new PhysicModelSpring(worldConfig, typesConfig),
    atomsFactory: create2dRandomDistribution,
    drawer: createDummyDrawer(),
  });
}

function warmup(sim: Simulation, n = 60): void {
  const s = sim as unknown as SimPrivate;
  for (let i = 0; i < n; ++i) {
    s.interact();
  }
}

function timedInteract(sim: Simulation, n: number) {
  const s = sim as unknown as SimPrivate;
  const acc = {
    typesDecays: 0,
    move: 0,
    updateCells: 0,
    collectPairs: 0,
    interactAtoms: 0,
    removeDeleted: 0,
    interactLinks: 0,
    handleTime: 0,
    pairs: 0,
    links: 0,
  };

  for (let t = 0; t < n; ++t) {
    let t0 = performance.now();
    s.applyPendingTypeChanges();
    s.handleDecays();
    s.applyPendingTypeChanges();
    acc.typesDecays += performance.now() - t0;

    t0 = performance.now();
    for (const atom of s._atoms) {
      s.interactionManager.moveAtom(atom);
      s.summaryManager.noticeAtom(atom, s.config.worldConfig);
    }
    acc.move += performance.now() - t0;

    t0 = performance.now();
    for (const atom of s._atoms) {
      s.spatialGridManager.updateAtomCell(atom);
    }
    acc.updateCells += performance.now() - t0;

    t0 = performance.now();
    let pairCount = 0;
    for (const atom of s._atoms) {
      s.spatialGridManager.handleAtom(atom, (lhs, rhs) => {
        pairCount++;
        s.interactionManager.interactAtoms(lhs, rhs);
      });
    }
    acc.collectPairs += 0;
    acc.interactAtoms += performance.now() - t0;
    acc.pairs += pairCount;

    t0 = performance.now();
    s.removeDeletedAtoms();
    acc.removeDeleted += performance.now() - t0;

    t0 = performance.now();
    let linkCount = 0;
    for (const link of s._links) {
      s.interactionManager.interactLink(link);
      s.summaryManager.noticeLink(link, s.config.worldConfig);
      linkCount++;
    }
    acc.interactLinks += performance.now() - t0;
    acc.links += linkCount;

    t0 = performance.now();
    s.interactionManager.handleTime();
    acc.handleTime += performance.now() - t0;
  }

  return acc;
}

function printBreakdown(label: string, acc: ReturnType<typeof timedInteract>, n: number) {
  const total =
    acc.typesDecays +
    acc.move +
    acc.updateCells +
    acc.interactAtoms +
    acc.removeDeleted +
    acc.interactLinks +
    acc.handleTime;
  const rows: [string, number][] = [
    ['types+decays', acc.typesDecays],
    ['move+summary', acc.move],
    ['updateCells', acc.updateCells],
    ['pairs+interact', acc.interactAtoms],
    ['removeDeleted', acc.removeDeleted],
    ['interactLinks', acc.interactLinks],
    ['handleTime', acc.handleTime],
  ];
  rows.sort((a, b) => b[1] - a[1]);
  console.log(`\n=== ${label} ===`);
  console.log(
    `atoms=${atomsCount} ticks=${n}  total=${total.toFixed(1)}ms  perTick=${(total / n).toFixed(3)}ms  (~${(1000 / (total / n)).toFixed(0)} tick/s)`,
  );
  console.log(
    `avg pairs/tick=${(acc.pairs / n).toFixed(0)}  avg links/tick=${(acc.links / n).toFixed(0)}`,
  );
  for (const [name, ms] of rows) {
    const pct = total > 0 ? (100 * ms) / total : 0;
    console.log(
      `  ${name.padEnd(16)} ${(ms / n).toFixed(3)}ms/tick  ${pct.toFixed(1)}%`,
    );
  }
}

function abTotal(label: string, patch?: (types: TypesConfig, world: WorldConfig) => void) {
  const sim = makeSim(patch);
  warmup(sim);
  const s = sim as unknown as SimPrivate;
  const start = performance.now();
  for (let i = 0; i < ticks; ++i) {
    s.interact();
  }
  const ms = performance.now() - start;
  console.log(
    `AB ${label.padEnd(36)} perTick=${(ms / ticks).toFixed(3)}ms  (~${(1000 / (ms / ticks)).toFixed(0)} tick/s)`,
  );
}

console.log(`node=${process.version} ticks=${ticks} atoms=${atomsCount}`);

{
  const sim = makeSim();
  warmup(sim);
  printBreakdown('default settled', timedInteract(sim, ticks), ticks);
}

{
  const sim = makeSim((_t, w) => {
    w.TEMPERATURE_MULTIPLIER = 0;
  });
  warmup(sim);
  printBreakdown('TEMP=0 settled', timedInteract(sim, ticks), ticks);
}

console.log('\n=== A/B total interact() ===');
abTotal('baseline');
abTotal('TEMPERATURE=0', (_t, w) => {
  w.TEMPERATURE_MULTIPLIER = 0;
});
abTotal('no LINK_STRENGTH_FACTOR', (t) => {
  delete (t as { LINK_STRENGTH_FACTOR?: unknown }).LINK_STRENGTH_FACTOR;
});
abTotal('MAX_INTERACTION_RADIUS=50', (_t, w) => {
  w.MAX_INTERACTION_RADIUS = 50;
});
abTotal('MAX_LINK_RADIUS=20', (_t, w) => {
  w.MAX_LINK_RADIUS = 20;
});
abTotal('GRAVITY all 0', (t) => {
  for (const row of t.GRAVITY) {
    row.fill(0);
  }
});
abTotal('TEMP=0 + no strength + Rint=50', (t, w) => {
  w.TEMPERATURE_MULTIPLIER = 0;
  w.MAX_INTERACTION_RADIUS = 50;
  delete (t as { LINK_STRENGTH_FACTOR?: unknown }).LINK_STRENGTH_FACTOR;
});
