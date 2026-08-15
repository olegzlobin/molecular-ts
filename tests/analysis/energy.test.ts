import { describe, expect, it } from '@jest/globals';
import { computeEnergy, emptyEnergySnapshot } from '@/lib/analysis/energy';
import { createBaseWorldConfig } from '@/lib/config/world';
import { createAtom } from '@/lib/utils/functions';
import type { TypesConfig } from '@/lib/config/types';
import type { LinkInterface } from '@/lib/simulation/types/atomic';

function typesStub(): TypesConfig {
  return {
    RADIUS: [1, 1],
    CHARGE: [0, 0],
    GRAVITY: [[0, 1], [1, 0]],
    LINK_GRAVITY: [[0, 0], [0, 0]],
    LINKS: [0, 0],
    TYPE_LINKS: [[0, 0], [0, 0]],
    TYPE_LINK_WEIGHTS: [[1, 1], [1, 1]],
    BOND_PREFERENCE: [[0, 0], [0, 0]],
    BOND_PREFERENCE_FACTOR: [[[1, 1], [1, 1]], [[1, 1], [1, 1]]],
    LINK_LENGTH: [1, 1],
    LINK_STIFFNESS: [1, 1],
    FREQUENCIES: [1, 1],
    COLORS: [[255, 0, 0], [0, 255, 0]],
    NAMES: ['A', 'B'],
    TRANSFORMATION: {},
    DECAYS: {},
  };
}

describe('computeEnergy', () => {
  it('returns zeros for empty system', () => {
    const worldConfig = createBaseWorldConfig();
    const snapshot = computeEnergy({
      atoms: [],
      links: [],
      forEachPair: () => undefined,
      worldConfig,
      typesConfig: typesStub(),
      viewMode: '2d',
    });
    expect(snapshot).toEqual(emptyEnergySnapshot());
  });

  it('counts kinetic energy as ½ m v²', () => {
    const worldConfig = createBaseWorldConfig();
    worldConfig.WORLD_GRAVITY = 0;
    worldConfig.GRAVITY_FORCE_MULTIPLIER = 0;
    worldConfig.COULOMB_FORCE_MULTIPLIER = 0;
    worldConfig.BOUNCE_FORCE_MULTIPLIER = 0;
    worldConfig.BOUNDS_FORCE_MULTIPLIER = 0;

    const atom = createAtom(0, [100, 100], [3, 4]);

    const snapshot = computeEnergy({
      atoms: [atom],
      links: [],
      forEachPair: () => undefined,
      worldConfig,
      typesConfig: typesStub(),
      viewMode: '2d',
    });

    expect(snapshot.kinetic).toBeCloseTo(0.5 * 25, 8);
    expect(snapshot.total).toBeCloseTo(snapshot.kinetic, 8);
  });

  it('adds positive bounce potential on overlap', () => {
    const worldConfig = createBaseWorldConfig();
    worldConfig.ATOM_RADIUS = 5;
    worldConfig.WORLD_GRAVITY = 0;
    worldConfig.GRAVITY_FORCE_MULTIPLIER = 0;
    worldConfig.COULOMB_FORCE_MULTIPLIER = 0;
    worldConfig.BOUNCE_FORCE_MULTIPLIER = 2;
    worldConfig.BOUNDS_FORCE_MULTIPLIER = 0;

    const lhs = createAtom(0, [0, 0], [0, 0]);
    const rhs = createAtom(1, [4, 0], [0, 0]);

    const snapshot = computeEnergy({
      atoms: [lhs, rhs],
      links: [],
      forEachPair: (callback) => callback(lhs, rhs),
      worldConfig,
      typesConfig: typesStub(),
      viewMode: '2d',
    });

    // r0 = 10, dist = 4, overlap = 6 → 0.5 * 2 * 36 = 36
    expect(snapshot.bounce).toBeCloseTo(36, 8);
  });

  it('adds hooke link potential', () => {
    const worldConfig = createBaseWorldConfig();
    worldConfig.ATOM_RADIUS = 5;
    worldConfig.WORLD_GRAVITY = 0;
    worldConfig.GRAVITY_FORCE_MULTIPLIER = 0;
    worldConfig.COULOMB_FORCE_MULTIPLIER = 0;
    worldConfig.BOUNCE_FORCE_MULTIPLIER = 0;
    worldConfig.BOUNDS_FORCE_MULTIPLIER = 0;
    worldConfig.LINK_FORCE_MULTIPLIER = 0.5;

    const lhs = createAtom(0, [0, 0], [0, 0]);
    const rhs = createAtom(1, [20, 0], [0, 0]);

    const link = { id: '0-1', lhs, rhs, order: 1, exportState: () => [lhs.id, rhs.id, 1] } as LinkInterface;

    const snapshot = computeEnergy({
      atoms: [lhs, rhs],
      links: [link],
      forEachPair: () => undefined,
      worldConfig,
      typesConfig: typesStub(),
      viewMode: '2d',
    });

    // rest = 10, extension = 10 → 0.5 * 0.5 * 1 * 100 = 25
    expect(snapshot.link).toBeCloseTo(25, 8);
  });
});
