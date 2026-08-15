import type { TypesConfig } from '../config/types';
import type { AtomInterface } from '../simulation/types/atomic';

export function linkStrengthFactor(
  typesConfig: TypesConfig,
  lhs: AtomInterface,
  rhs: AtomInterface,
): number {
  const factors = typesConfig.LINK_STRENGTH_FACTOR;
  if (!factors) {
    return 1;
  }

  const agents = new Set<number>();
  for (const neighbor of Object.values(lhs.bonds.getStorage())) {
    if (neighbor !== rhs) {
      agents.add(neighbor.type);
    }
  }
  for (const neighbor of Object.values(rhs.bonds.getStorage())) {
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
