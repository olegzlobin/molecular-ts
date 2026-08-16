import type { TypesConfig, ViewMode, WorldConfig } from '../config/types';
import type { AtomInterface, LinkInterface } from '../simulation/types/atomic';
import { typeMass } from '../config/mass';
import { GeometryHelper } from '../utils/structs';
import { getViewModeConfig } from '../utils/functions';
import { linkStrengthFactor } from '../utils/link-strength';

export type EnergySnapshot = {
  kinetic: number;
  gravity: number;
  bounce: number;
  link: number;
  bounds: number;
  total: number;
};

export type EnergyReport = {
  current: EnergySnapshot;
  initial: EnergySnapshot | null;
  delta: number;
  deltaRel: number;
};

export function emptyEnergySnapshot(): EnergySnapshot {
  return {
    kinetic: 0,
    gravity: 0,
    bounce: 0,
    link: 0,
    bounds: 0,
    total: 0,
  };
}

export function emptyEnergyReport(): EnergyReport {
  return {
    current: emptyEnergySnapshot(),
    initial: null,
    delta: 0,
    deltaRel: 0,
  };
}

function pairForceCoeff(matrix: number[][], lhs: AtomInterface, rhs: AtomInterface): number {
  return (matrix[lhs.type][rhs.type] + matrix[rhs.type][lhs.type]) / 2;
}

function gravityPotentialV2(gEff: number, dist: number): number {
  if (dist >= 1) {
    return -gEff / dist;
  }
  return -gEff * dist;
}

function linkBiasPotential(gEff: number, dist: number): number {
  return -gEff * dist;
}

function linkElasticFactor(
  typesConfig: TypesConfig,
  lhs: AtomInterface,
  rhs: AtomInterface,
): number {
  const stiffness = typesConfig.LINK_STIFFNESS;
  const base = ((stiffness?.[lhs.type] ?? 1) + (stiffness?.[rhs.type] ?? 1)) / 2;
  return base * linkStrengthFactor(typesConfig, lhs, rhs);
}

export type ComputeEnergyInput = {
  atoms: Iterable<AtomInterface>;
  links: Iterable<LinkInterface>;
  forEachPair: (callback: (lhs: AtomInterface, rhs: AtomInterface) => void) => void;
  worldConfig: WorldConfig;
  typesConfig: TypesConfig;
  viewMode: ViewMode;
};

export function computeEnergy(input: ComputeEnergyInput): EnergySnapshot {
  const { atoms, links, forEachPair, worldConfig, typesConfig, viewMode } = input;
  const geometry = new GeometryHelper(worldConfig, typesConfig);
  const snapshot = emptyEnergySnapshot();

  for (const atom of atoms) {
    const mass = typeMass(typesConfig, atom.type);
    snapshot.kinetic += 0.5 * mass * atom.speed.abs2;

    if (worldConfig.WORLD_GRAVITY) {
      snapshot.gravity += -mass * worldConfig.WORLD_GRAVITY * atom.position[1];
    }

    const bounds = getViewModeConfig(worldConfig, viewMode).BOUNDS;
    for (let i = 0; i < atom.position.length; ++i) {
      let penetration = 0;
      if (atom.position[i] < bounds.MIN_POSITION[i]) {
        penetration = bounds.MIN_POSITION[i] - atom.position[i];
      } else if (atom.position[i] > bounds.MAX_POSITION[i]) {
        penetration = atom.position[i] - bounds.MAX_POSITION[i];
      }
      if (penetration > 0) {
        snapshot.bounds += 0.5 * worldConfig.BOUNDS_FORCE_MULTIPLIER * penetration ** 2;
      }
    }
  }

  const maxR2 = worldConfig.MAX_INTERACTION_RADIUS ** 2;
  forEachPair((lhs, rhs) => {
    let dist2 = 0;
    for (let i = 0; i < lhs.position.length; ++i) {
      const d = rhs.position[i] - lhs.position[i];
      dist2 += d * d;
    }
    if (dist2 > maxR2 || dist2 <= 0) {
      return;
    }

    const dist = Math.sqrt(dist2);
    const r0 = geometry.getAtomsRadiusSum(lhs, rhs);

    if (dist < r0) {
      const overlap = r0 - dist;
      snapshot.bounce += 0.5 * worldConfig.BOUNCE_FORCE_MULTIPLIER * overlap ** 2;
      return;
    }

    const bonded = lhs.bonds.has(rhs);
    const g = worldConfig.GRAVITY_FORCE_MULTIPLIER * pairForceCoeff(
      bonded ? typesConfig.LINK_BIAS : typesConfig.GRAVITY,
      lhs,
      rhs,
    );
    snapshot.gravity += bonded
      ? linkBiasPotential(g, dist)
      : gravityPotentialV2(g, dist);
  });

  for (const link of links) {
    const { lhs, rhs } = link;
    let dist2 = 0;
    for (let i = 0; i < lhs.position.length; ++i) {
      const d = rhs.position[i] - lhs.position[i];
      dist2 += d * d;
    }
    if (dist2 <= 0) {
      continue;
    }

    const dist = Math.sqrt(dist2);
    const r0 = geometry.getAtomsRadiusSum(lhs, rhs);
    if (dist <= r0) {
      continue;
    }

    const lengths = typesConfig.LINK_LENGTH;
    const lengthMult = ((lengths?.[lhs.type] ?? 1) + (lengths?.[rhs.type] ?? 1)) / 2;
    const restLength = r0 * lengthMult;
    const extension = dist - restLength;
    const elastic = linkElasticFactor(typesConfig, lhs, rhs);
    snapshot.link += 0.5 * worldConfig.LINK_FORCE_MULTIPLIER * elastic * extension ** 2;
  }

  snapshot.total = snapshot.kinetic
    + snapshot.gravity
    + snapshot.bounce
    + snapshot.link
    + snapshot.bounds;

  return snapshot;
}

export function buildEnergyReport(
  current: EnergySnapshot,
  initial: EnergySnapshot | null,
): EnergyReport {
  if (!initial) {
    return {
      current,
      initial: null,
      delta: 0,
      deltaRel: 0,
    };
  }

  const delta = current.total - initial.total;
  const denom = Math.abs(initial.total);
  return {
    current,
    initial,
    delta,
    deltaRel: denom > 0 ? delta / denom : 0,
  };
}
