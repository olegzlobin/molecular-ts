import { createDefaultTypesConfig } from '../src/lib/config/atom-types';
import { createBaseWorldConfig } from '../src/lib/config/world';
import { create2dRandomDistribution } from '../src/lib/config/atoms';
import { Simulation } from '../src/lib/simulation/simulation';
import { PhysicModelSpring } from '../src/lib/physics/spring';
import type { DrawerInterface } from '../src/lib/drawer/types';
import type { TypesConfig } from '../src/lib/config/types';

const noopDrawer: DrawerInterface = {
  draw() {},
  clear() {},
};

function makeSim(typesConfig: TypesConfig, atomsCount: number): Simulation {
  const worldConfig = createBaseWorldConfig();
  worldConfig.VIEW_MODE = '2d';
  worldConfig.PHYSIC_MODEL = 'spring';
  worldConfig.PLAYBACK_SPEED = 1;
  worldConfig.CONFIG_2D.INITIAL.ATOMS_COUNT = atomsCount;
  return new Simulation({
    viewMode: '2d',
    worldConfig,
    typesConfig,
    physicModel: new PhysicModelSpring(worldConfig, typesConfig),
    atomsFactory: create2dRandomDistribution,
    drawer: noopDrawer,
  });
}

function bench(label: string, typesConfig: TypesConfig, atomsCount: number, ticks: number): number {
  const sim = makeSim(typesConfig, atomsCount);
  const interact = (sim as unknown as { interact: () => void }).interact.bind(sim);

  for (let i = 0; i < 20; ++i) {
    interact();
  }

  const start = performance.now();
  for (let i = 0; i < ticks; ++i) {
    interact();
  }
  const ms = performance.now() - start;
  const perTick = ms / ticks;
  console.log(
    `${label.padEnd(28)} atoms=${atomsCount} ticks=${ticks}  total=${ms.toFixed(1)}ms  perTick=${perTick.toFixed(3)}ms  (~${(1000 / perTick).toFixed(0)} tick/s)`,
  );
  return perTick;
}

const ticks = Number(process.env.BENCH_TICKS ?? 300);
const atoms = Number(process.env.BENCH_ATOMS ?? 2000);

console.log(`mode=${process.env.BENCH_MODE ?? 'unknown'} node=${process.version}\n`);

{
  const types = createDefaultTypesConfig();
  bench('organic zero forces', types, atoms, ticks);
}

{
  const types = createDefaultTypesConfig();
  for (let i = 0; i < 4; ++i) {
    for (let j = 0; j < 4; ++j) {
      types.GRAVITY[i][j] = i === j ? -2 : -0.5;
    }
  }
  bench('with gravity matrix', types, atoms, ticks);
}

