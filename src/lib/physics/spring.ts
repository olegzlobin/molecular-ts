import type { TypesConfig, WorldConfig } from '../config/types';
import type { AtomInterface } from '../simulation/types/atomic';
import type { PhysicModelInterface } from '../simulation/types/interaction';
import { GeometryHelper } from '../utils/structs';

export class PhysicModelSpring implements PhysicModelInterface {
  public readonly geometry: GeometryHelper;
  private WORLD_CONFIG: WorldConfig;
  private TYPES_CONFIG: TypesConfig;

  constructor(worldConfig: WorldConfig, typesConfig: TypesConfig) {
    this.WORLD_CONFIG = worldConfig;
    this.TYPES_CONFIG = typesConfig;
    this.geometry = new GeometryHelper(this.WORLD_CONFIG, this.TYPES_CONFIG);
  }

  getGravityForce(lhs: AtomInterface, rhs: AtomInterface, dist2: number): number {
    return this.getGravityForces(lhs, rhs, dist2)[0];
  }

  getGravityForces(lhs: AtomInterface, rhs: AtomInterface, dist2: number): [number, number] {
    const bounceDistance = this.geometry.getAtomsRadiusSum(lhs, rhs);
    const massL = this.geometry.getMassMultiplier(lhs, rhs);
    const massR = this.geometry.getMassMultiplier(rhs, lhs);

    if (dist2 < bounceDistance ** 2) {
      const bounceForce = (bounceDistance - Math.sqrt(dist2))
        * (-this.WORLD_CONFIG.BOUNCE_FORCE_MULTIPLIER);
      return [bounceForce * massL, bounceForce * massR];
    }

    const bonded = lhs.bonds.has(rhs);
    const gravityMatrix = bonded ? this.TYPES_CONFIG.LINK_GRAVITY : this.TYPES_CONFIG.GRAVITY;
    const gL = gravityMatrix[lhs.type][rhs.type];
    const gR = gravityMatrix[rhs.type][lhs.type];
    const qi = this.TYPES_CONFIG.CHARGE?.[lhs.type] ?? 0;
    const qj = this.TYPES_CONFIG.CHARGE?.[rhs.type] ?? 0;
    const coulomb = (qi !== 0 && qj !== 0)
      ? this.WORLD_CONFIG.COULOMB_FORCE_MULTIPLIER * qi * qj
      : 0;

    if (gL === 0 && gR === 0 && coulomb === 0) {
      return [0, 0];
    }

    const invDist2 = 1 / Math.max(dist2, 1);
    const gravityMult = this.WORLD_CONFIG.GRAVITY_FORCE_MULTIPLIER;
    return [
      (gravityMult * gL - coulomb) * invDist2 * massL,
      (gravityMult * gR - coulomb) * invDist2 * massR,
    ];
  }

  getLinkForce(lhs: AtomInterface, rhs: AtomInterface, dist2: number, elasticFactor: number): number {
    const lengths = this.TYPES_CONFIG.LINK_LENGTH;
    const lengthMult = ((lengths?.[lhs.type] ?? 1) + (lengths?.[rhs.type] ?? 1)) / 2;
    const restLength = this.geometry.getAtomsRadiusSum(lhs, rhs) * lengthMult;
    const extension = Math.sqrt(dist2) - restLength;

    return this.WORLD_CONFIG.LINK_FORCE_MULTIPLIER
      * elasticFactor
      * this.geometry.getMassMultiplier(lhs, rhs)
      * extension;
  }

  getBoundsForce(dist: number): number {
    return this.WORLD_CONFIG.BOUNDS_FORCE_MULTIPLIER * dist;
  }
}
