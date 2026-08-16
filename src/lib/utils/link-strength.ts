import type { TypesConfig } from '../config/types';
import type { AtomInterface } from '../simulation/types/atomic';

export function isUnitFactorTensor(tensor: number[][][] | undefined): boolean {
  if (!tensor) {
    return true;
  }
  for (let i = 0; i < tensor.length; ++i) {
    const plane = tensor[i];
    for (let j = 0; j < plane.length; ++j) {
      const row = plane[j];
      for (let k = 0; k < row.length; ++k) {
        if (row[k] !== 1) {
          return false;
        }
      }
    }
  }
  return true;
}

export function linkStrengthFactor(
  typesConfig: TypesConfig,
  lhs: AtomInterface,
  rhs: AtomInterface,
): number {
  const factors = typesConfig.LINK_STRENGTH_FACTOR;
  if (!factors || isUnitFactorTensor(factors)) {
    return 1;
  }

  const agents = new Set<number>();
  const lhsBonds = lhs.bonds.getStorage();
  for (const key in lhsBonds) {
    const neighbor = lhsBonds[key];
    if (neighbor !== rhs) {
      agents.add(neighbor.type);
    }
  }
  const rhsBonds = rhs.bonds.getStorage();
  for (const key in rhsBonds) {
    const neighbor = rhsBonds[key];
    if (neighbor !== lhs) {
      agents.add(neighbor.type);
    }
  }

  let strength = 1;
  for (const agentType of agents) {
    strength *= factors[agentType]?.[lhs.type]?.[rhs.type] ?? 1;
  }
  return strength;
}
