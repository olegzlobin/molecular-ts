import type { TypesConfig, WorldConfig } from '../config/types';
import type { AtomInterface } from '../simulation/types/atomic';
import type { PhysicModelInterface } from '../simulation/types/interaction';
import { GeometryHelper } from '../utils/structs';

export class PhysicModelV2 implements PhysicModelInterface {
  public readonly geometry: GeometryHelper;
  private WORLD_CONFIG: WorldConfig;
  private TYPES_CONFIG: TypesConfig;

  constructor(worldConfig: WorldConfig, typesConfig: TypesConfig) {
    this.WORLD_CONFIG = worldConfig;
    this.TYPES_CONFIG = typesConfig;
    this.geometry = new GeometryHelper(this.WORLD_CONFIG, this.TYPES_CONFIG);
  }

  getGravityForce(lhs: AtomInterface, rhs: AtomInterface, dist2: number): number {
    const bounceDistance = this.geometry.getAtomsRadiusSum(lhs, rhs);
    const massMult = this.geometry.getMassMultiplier(lhs, rhs);

    if (dist2 < bounceDistance ** 2) {
      const bounceForce = (bounceDistance - Math.sqrt(dist2))
        * (-this.WORLD_CONFIG.BOUNCE_FORCE_MULTIPLIER);
      return bounceForce * massMult;
    }

    const gravity = lhs.bonds.has(rhs)
      ? this.TYPES_CONFIG.LINK_GRAVITY[lhs.type][rhs.type]
      : this.TYPES_CONFIG.GRAVITY[lhs.type][rhs.type];
    const multiplier = this.WORLD_CONFIG.GRAVITY_FORCE_MULTIPLIER * gravity;

    return (multiplier / Math.max(dist2, 1)) * massMult;
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
