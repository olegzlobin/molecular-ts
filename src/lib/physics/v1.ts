import type { TypesConfig, WorldConfig } from '../config/types';
import type { AtomInterface } from '../simulation/types/atomic';
import type { PhysicModelInterface } from '../simulation/types/interaction';
import { GeometryHelper } from '../utils/structs';

export class PhysicModelV1 implements PhysicModelInterface {
  public readonly geometry: GeometryHelper;
  private WORLD_CONFIG: WorldConfig;
  private TYPES_CONFIG: TypesConfig;

  constructor(worldConfig: WorldConfig, typesConfig: TypesConfig) {
    this.WORLD_CONFIG = worldConfig;
    this.TYPES_CONFIG = typesConfig;
    this.geometry = new GeometryHelper(this.WORLD_CONFIG, this.TYPES_CONFIG);
  }

  getGravityForce(lhs: AtomInterface, rhs: AtomInterface, dist2: number): number {
    let multiplier: number;
    const bounce = dist2 < this.geometry.getAtomsRadiusSum(lhs, rhs) ** 2;

    if (bounce) {
      multiplier = -this.WORLD_CONFIG.BOUNCE_FORCE_MULTIPLIER;
    } else if (!lhs.bonds.has(rhs)) {
      multiplier = this.WORLD_CONFIG.GRAVITY_FORCE_MULTIPLIER * this.TYPES_CONFIG.GRAVITY[lhs.type][rhs.type];
    } else {
      multiplier = this.WORLD_CONFIG.GRAVITY_FORCE_MULTIPLIER * this.TYPES_CONFIG.LINK_GRAVITY[lhs.type][rhs.type];
    }

    if (!bounce) {
      const qi = this.TYPES_CONFIG.CHARGE?.[lhs.type] ?? 0;
      const qj = this.TYPES_CONFIG.CHARGE?.[rhs.type] ?? 0;
      if (qi !== 0 && qj !== 0) {
        multiplier -= this.WORLD_CONFIG.COULOMB_FORCE_MULTIPLIER * qi * qj;
      }
    }

    return multiplier * this.geometry.getMassMultiplier(lhs, rhs) / dist2;
  }

  getLinkForce(lhs: AtomInterface, rhs: AtomInterface, dist2: number, elasticFactor: number): number {
    return this.WORLD_CONFIG.LINK_FORCE_MULTIPLIER * this.geometry.getMassMultiplier(lhs, rhs) * elasticFactor;
  }

  getBoundsForce(dist: number): number {
    return this.WORLD_CONFIG.BOUNDS_FORCE_MULTIPLIER * dist;
  }
}
