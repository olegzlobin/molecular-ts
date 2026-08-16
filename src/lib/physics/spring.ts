import type { TypesConfig, WorldConfig } from '../config/types';
import type { AtomInterface } from '../simulation/types/atomic';
import type { PhysicModelInterface } from '../simulation/types/interaction';
import { GeometryHelper } from '../utils/structs';

export class PhysicModelSpring implements PhysicModelInterface {
  public readonly geometry: GeometryHelper;
  private WORLD_CONFIG: WorldConfig;
  private TYPES_CONFIG: TypesConfig;
  private readonly forceOut: [number, number] = [0, 0];

  constructor(worldConfig: WorldConfig, typesConfig: TypesConfig) {
    this.WORLD_CONFIG = worldConfig;
    this.TYPES_CONFIG = typesConfig;
    this.geometry = new GeometryHelper(this.WORLD_CONFIG, this.TYPES_CONFIG);
  }

  getGravityForce(lhs: AtomInterface, rhs: AtomInterface, dist2: number): number {
    return this.getGravityForces(lhs, rhs, dist2)[0];
  }

  getGravityForces(
    lhs: AtomInterface,
    rhs: AtomInterface,
    dist2: number,
    out: [number, number] = this.forceOut,
  ): [number, number] {
    const bounceDistance = this.geometry.getAtomsRadiusSum(lhs, rhs);
    const massL = this.geometry.getMassMultiplier(lhs, rhs);
    const massR = this.geometry.getMassMultiplier(rhs, lhs);

    if (dist2 < bounceDistance ** 2) {
      const bounceForce = (bounceDistance - Math.sqrt(dist2))
        * (-this.WORLD_CONFIG.BOUNCE_FORCE_MULTIPLIER);
      out[0] = bounceForce * massL;
      out[1] = bounceForce * massR;
      return out;
    }

    const bonded = lhs.bonds.has(rhs);
    const matrix = bonded ? this.TYPES_CONFIG.LINK_BIAS : this.TYPES_CONFIG.GRAVITY;
    const gL = matrix[lhs.type][rhs.type];
    const gR = matrix[rhs.type][lhs.type];
    if (gL === 0 && gR === 0) {
      out[0] = 0;
      out[1] = 0;
      return out;
    }

    const invDist2 = 1 / Math.max(dist2, 1);
    const gravityMult = this.WORLD_CONFIG.GRAVITY_FORCE_MULTIPLIER;
    if (bonded) {
      out[0] = gravityMult * gL * massL;
      out[1] = gravityMult * gR * massR;
      return out;
    }
    out[0] = gravityMult * gL * invDist2 * massL;
    out[1] = gravityMult * gR * invDist2 * massR;
    return out;
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
