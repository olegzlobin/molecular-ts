import { describe, expect, it } from '@jest/globals';
import type { TypesConfig, WorldConfig } from '@/lib/config/types';
import { createAtom } from '@/lib/utils/functions';
import { LinkManager, RulesHelper } from '@/lib/utils/structs';

function typesConfig(): TypesConfig {
  return {
    NAMES: ['C', 'O', 'H'],
    COLORS: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
    RADIUS: [1, 1, 1],
    CHARGE: [0, 0, 0],
    FREQUENCIES: [1, 1, 1],
    GRAVITY: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    LINK_GRAVITY: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    LINKS: [4, 2, 1],
    TYPE_LINKS: [
      [0, 2, 4],
      [2, 0, 1],
      [4, 1, 0],
    ],
    TYPE_LINK_WEIGHTS: [
      [1, 2, 1],
      [2, 1, 1],
      [1, 1, 1],
    ],
    BOND_PREFERENCE: [
      [0, 4, 1],
      [4, 0, 1],
      [1, 1, 0],
    ],
    BOND_PREFERENCE_FACTOR: undefined,
    LINK_LENGTH: [1, 1, 1],
    LINK_STIFFNESS: [1, 1, 1],
    TRANSFORMS: undefined,
    DECAY: undefined,
  } as unknown as TypesConfig;
}

function worldConfig(): WorldConfig {
  return {} as WorldConfig;
}

describe('partial link order', () => {
  it('forms C=O with order 2 when both have free valence', () => {
    const types = typesConfig();
    const rules = new RulesHelper(worldConfig(), types);
    const links = new LinkManager();
    const c = createAtom(0, [0, 0], undefined, 0);
    const o = createAtom(1, [1, 0], undefined, 1);

    expect(rules.canLink(c, o)).toBe(true);
    expect(rules.getLinkOrder(c, o)).toBe(2);

    const link = links.create(c, o, rules.getLinkOrder(c, o));
    expect(link.order).toBe(2);
    expect(c.bonds.getTotalOrder()).toBe(2);
    expect(o.bonds.getTotalOrder()).toBe(2);
  });

  it('forms C–OH with order 1 when O already bonded to H', () => {
    const types = typesConfig();
    const rules = new RulesHelper(worldConfig(), types);
    const links = new LinkManager();
    const c = createAtom(0, [0, 0], undefined, 0);
    const o = createAtom(1, [1, 0], undefined, 1);
    const h = createAtom(2, [2, 0], undefined, 2);

    links.create(o, h, 1);
    expect(rules.canLink(c, o)).toBe(true);
    expect(rules.getLinkOrder(c, o)).toBe(1);

    const link = links.create(c, o, rules.getLinkOrder(c, o));
    expect(link.order).toBe(1);
    expect(o.bonds.getTotalOrder()).toBe(2);
    expect(c.bonds.getTotalOrder()).toBe(1);
  });

  it('rejects link when O has no free valence', () => {
    const types = typesConfig();
    const rules = new RulesHelper(worldConfig(), types);
    const links = new LinkManager();
    const c = createAtom(0, [0, 0], undefined, 0);
    const o = createAtom(1, [1, 0], undefined, 1);
    const h1 = createAtom(2, [2, 0], undefined, 2);
    const h2 = createAtom(2, [3, 0], undefined, 3);

    links.create(o, h1, 1);
    links.create(o, h2, 1);
    expect(rules.canLink(c, o)).toBe(false);
    expect(rules.getLinkOrder(c, o)).toBe(0);
  });
});
