import type { AtomInterface } from '../simulation/types/atomic';
import type { Compound } from './types';
import { createCompoundByAtom } from './factories';
import { ensureTypeNames, defaultTypeName } from '../config/atom-types';

export type MoleculeFormulaRow = {
  formula: string;
  count: number;
  size: number;
  atomTotal: number;
  moleculeFraction: number;
  atomFraction: number;
};

export type MoleculeSnapshot = {
  tick: number;
  totalAtoms: number;
  moleculeCount: number;
  freeAtomCount: number;
  formulas: MoleculeFormulaRow[];
};

export function collectAllCompounds(atoms: Iterable<AtomInterface>): Compound[] {
  const visited = new Set<AtomInterface>();
  const compounds: Compound[] = [];
  for (const atom of atoms) {
    if (visited.has(atom)) {
      continue;
    }
    const compound = createCompoundByAtom(atom);
    for (const member of compound) {
      visited.add(member);
    }
    compounds.push(compound);
  }
  return compounds;
}

export function toSubscriptDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => '₀₁₂₃₄₅₆₇₈₉'[Number(digit)]);
}

export function compoundFormula(compound: Compound, names: string[]): string {
  const counts = new Map<number, number>();
  for (const atom of compound) {
    counts.set(atom.type, (counts.get(atom.type) ?? 0) + 1);
  }

  const parts = [...counts.entries()].map(([type, count]) => ({
    name: names[type] || defaultTypeName(type),
    count,
  }));

  parts.sort((a, b) => {
    const rank = (name: string) => (name === 'C' ? 0 : name === 'H' ? 1 : 2);
    const ra = rank(a.name);
    const rb = rank(b.name);
    if (ra !== rb) {
      return ra - rb;
    }
    if (ra === 2) {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  return parts.map(({ name, count }) => (count > 1 ? `${name}${toSubscriptDigits(count)}` : name)).join('');
}

export function buildMoleculeSnapshot(
  atoms: Iterable<AtomInterface>,
  typeNames: string[] | undefined,
  tick: number,
): MoleculeSnapshot {
  const atomList = [...atoms];
  const names = ensureTypeNames(typeNames, Math.max(
    ...atomList.map((atom) => atom.type + 1),
    typeNames?.length ?? 0,
    0,
  ));
  const compounds = collectAllCompounds(atomList);
  const totals = new Map<string, { count: number; size: number }>();

  let freeAtomCount = 0;
  let moleculeCount = 0;

  for (const compound of compounds) {
    const size = compound.size;
    if (size < 2) {
      freeAtomCount += 1;
    } else {
      moleculeCount += 1;
    }
    const formula = compoundFormula(compound, names);
    const prev = totals.get(formula);
    if (prev) {
      prev.count += 1;
    } else {
      totals.set(formula, { count: 1, size });
    }
  }

  const totalAtoms = atomList.length;
  const totalGroups = compounds.length || 1;
  const formulas = [...totals.entries()]
    .map(([formula, { count, size }]) => ({
      formula,
      count,
      size,
      atomTotal: count * size,
      moleculeFraction: count / totalGroups,
      atomFraction: totalAtoms > 0 ? (count * size) / totalAtoms : 0,
    }))
    .sort((a, b) => b.atomTotal - a.atomTotal || b.count - a.count || a.formula.localeCompare(b.formula));

  return {
    tick,
    totalAtoms,
    moleculeCount,
    freeAtomCount,
    formulas,
  };
}
