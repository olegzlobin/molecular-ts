import { describe, expect, it } from '@jest/globals';
import { buildMoleculeSnapshot, compoundFormula } from '@/lib/analysis/molecules';
import { createAtom } from '@/lib/utils/functions';
import { LinkManager } from '@/lib/utils/structs';

describe('molecule formulas', () => {
  it('builds Hill-style formulas from type names', () => {
    const links = new LinkManager();
    const c = createAtom(0, [0, 0], undefined, 0);
    const h1 = createAtom(1, [1, 0], undefined, 1);
    const h2 = createAtom(1, [0, 1], undefined, 2);
    const o = createAtom(2, [1, 1], undefined, 3);
    links.create(c, h1);
    links.create(c, h2);
    links.create(c, o);

    expect(compoundFormula(new Set([c, h1, h2, o]), ['C', 'H', 'O'])).toBe('CH2O');
  });

  it('counts formulas and free atoms in a snapshot', () => {
    const links = new LinkManager();
    const h1 = createAtom(1, [0, 0], undefined, 0);
    const h2 = createAtom(1, [1, 0], undefined, 1);
    const o = createAtom(2, [0.5, 0], undefined, 2);
    const freeC = createAtom(0, [5, 5], undefined, 3);
    links.create(h1, o);
    links.create(h2, o);

    const snapshot = buildMoleculeSnapshot([h1, h2, o, freeC], ['C', 'H', 'O'], 42);
    expect(snapshot.tick).toBe(42);
    expect(snapshot.totalAtoms).toBe(4);
    expect(snapshot.moleculeCount).toBe(1);
    expect(snapshot.freeAtomCount).toBe(1);
    expect(snapshot.formulas).toEqual([
      {
        formula: 'H2O',
        count: 1,
        size: 3,
        atomTotal: 3,
        moleculeFraction: 0.5,
        atomFraction: 0.75,
      },
      {
        formula: 'C',
        count: 1,
        size: 1,
        atomTotal: 1,
        moleculeFraction: 0.5,
        atomFraction: 0.25,
      },
    ]);
  });
});
