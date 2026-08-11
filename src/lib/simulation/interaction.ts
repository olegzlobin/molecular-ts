import type { WorldConfig, TypesConfig, ViewMode } from '../config/types';
import type { LinkManagerInterface, RulesHelperInterface } from './types/utils';
import type { AtomInterface, LinkInterface } from './types/atomic';
import type { NumericVector, VectorInterface } from '../math/types';
import type { InteractionManagerInterface } from './types/interaction';
import type { PhysicModelInterface } from './types/interaction';
import { isEqual, Vector } from '../math';
import { getViewModeConfig } from '../utils/functions';
import type { SummaryManagerInterface } from '../analysis/types';

export class InteractionManager implements InteractionManagerInterface {
  private readonly VIEW_MODE: ViewMode;
  private readonly WORLD_CONFIG: WorldConfig;
  private readonly TYPES_CONFIG: TypesConfig;
  private readonly linkManager: LinkManagerInterface;
  private readonly ruleHelper: RulesHelperInterface;
  private readonly summaryManager: SummaryManagerInterface;
  private physicModel: PhysicModelInterface;
  private time: number;
  private bufVector: VectorInterface = new Vector([0, 0]);
  private tempVector: VectorInterface = new Vector([0, 0]);

  constructor(
    viewMode: ViewMode,
    worldConfig: WorldConfig,
    typesConfig: TypesConfig,
    linkManager: LinkManagerInterface,
    physicModel: PhysicModelInterface,
    ruleHelper: RulesHelperInterface,
    summaryManager: SummaryManagerInterface
  ) {
    this.VIEW_MODE = viewMode;
    this.WORLD_CONFIG = worldConfig;
    this.TYPES_CONFIG = typesConfig;
    this.linkManager = linkManager;
    this.physicModel = physicModel;
    this.ruleHelper = ruleHelper;
    this.summaryManager = summaryManager;
    this.time = 0;
  }

  handleTime(): void {
    this.time++;
  }

  moveAtom(atom: AtomInterface): void {
    // Apply temperature
    this.handleTemperature(atom);

    const worldGravity = this.WORLD_CONFIG.WORLD_GRAVITY;
    if (worldGravity) {
      atom.speed[1] += worldGravity * this.WORLD_CONFIG.SPEED;
    }

    // Apply speed
    atom.position.add(atom.speed);

    // Apply inertia
    atom.speed.mul(this.WORLD_CONFIG.INERTIAL_MULTIPLIER);

    // Apply bounce from boundaries
    this.handleBounds(atom);
  }

  interactLink(link: LinkInterface): void {
    this.fillDistVector(link.lhs, link.rhs, this.bufVector);
    const dist2 = this.getDist2(this.bufVector);

    if (
      dist2 >= (this.WORLD_CONFIG.MAX_LINK_RADIUS * this.getPairLinkDistanceFactor(link.lhs, link.rhs)) ** 2
      || dist2 > this.WORLD_CONFIG.MAX_INTERACTION_RADIUS ** 2
      || this.ruleHelper.isLinkRedundant(link.lhs, link.rhs)
    ) {
      this.linkManager.delete(link);
      this.summaryManager.noticeLinkDeleted(link, this.WORLD_CONFIG);
      return;
    }

    const radiusSum = this.physicModel.geometry.getAtomsRadiusSum(link.lhs, link.rhs);
    if (dist2 <= radiusSum ** 2) {
      return;
    }

    const elasticFactor = (
      this.getElasticFactor(link.lhs, link.rhs) + this.getElasticFactor(link.rhs, link.lhs)
    ) / 2;
    this.handleLinkInfluence(link.lhs, link.rhs, dist2, this.bufVector, elasticFactor);
    this.handleLinkInfluence(link.rhs, link.lhs, dist2, this.bufVector.inverse(), elasticFactor);
  }

  interactAtomsStep1(lhs: AtomInterface, rhs: AtomInterface): void {
    if (lhs === rhs) {
      return;
    }

    this.fillDistVector(lhs, rhs, this.bufVector);
    const dist2 = this.getDist2(this.bufVector);

    if (dist2 <= this.WORLD_CONFIG.MAX_LINK_RADIUS ** 2) {
      this.updateDistanceFactor(lhs, rhs);
      this.updateDistanceFactor(rhs, lhs);
      this.updateElasticFactor(lhs, rhs);
      this.updateElasticFactor(rhs, lhs);
    }
  }

  interactAtomsStep2(lhs: AtomInterface, rhs: AtomInterface): void {
    if (lhs === rhs || lhs.toDelete || rhs.toDelete) {
      return;
    }

    this.fillDistVector(lhs, rhs, this.bufVector);
    const dist2 = this.getDist2(this.bufVector);

    if (dist2 > this.WORLD_CONFIG.MAX_INTERACTION_RADIUS ** 2) {
      return;
    }

    const dist = Math.sqrt(dist2);
    if (dist > 0) {
      const forceLhs = this.normalizeForce(this.physicModel.getGravityForce(lhs, rhs, dist2));
      const forceRhs = this.normalizeForce(this.physicModel.getGravityForce(rhs, lhs, dist2));
      for (let i = 0; i < this.bufVector.length; ++i) {
        const dir = this.bufVector[i] / dist;
        lhs.speed[i] += dir * forceLhs;
        rhs.speed[i] -= dir * forceRhs;
      }
    }

    if (
      !lhs.bonds.has(rhs) &&
      this.ruleHelper.canLink(lhs, rhs) &&
      dist2 <= (this.WORLD_CONFIG.MAX_LINK_RADIUS * this.getPairLinkDistanceFactor(lhs, rhs)) ** 2
    ) {
      const link = this.linkManager.create(lhs, rhs);

      const transformations = this.ruleHelper.handleTransform(lhs, rhs);
      for (const transformation of transformations) {
        this.summaryManager.noticeTransformation(...transformation);
      }

      this.summaryManager.noticeLinkCreated(link, this.WORLD_CONFIG);
    }
  }

  setPhysicModel(model: PhysicModelInterface): void {
    this.physicModel = model;
  }

  clearDistanceFactor(atom: AtomInterface): void {
    for (let i = 0; i < this.TYPES_CONFIG.FREQUENCIES.length; ++i) {
      atom.linkDistanceFactors[i] = 1;
    }
  }

  clearElasticFactor(atom: AtomInterface): void {
    for (let i = 0; i < this.TYPES_CONFIG.FREQUENCIES.length; ++i) {
      atom.linkElasticFactors[i] = 1;
    }
  }

  getDistanceFactor(lhs: AtomInterface, rhs: AtomInterface): number {
    return lhs.linkDistanceFactors[rhs.type] ?? 1;
  }

  getPairLinkDistanceFactor(lhs: AtomInterface, rhs: AtomInterface): number {
    const lengths = this.TYPES_CONFIG.LINK_LENGTH;
    const lengthFactor = ((lengths?.[lhs.type] ?? 1) + (lengths?.[rhs.type] ?? 1)) / 2;
    return lengthFactor * this.getDistanceFactor(lhs, rhs) * this.getDistanceFactor(rhs, lhs);
  }

  getElasticFactor(lhs: AtomInterface, rhs: AtomInterface): number {
    const stiffness = this.TYPES_CONFIG.LINK_STIFFNESS;
    const stiffnessFactor = ((stiffness?.[lhs.type] ?? 1) + (stiffness?.[rhs.type] ?? 1)) / 2;
    return stiffnessFactor * (lhs.linkElasticFactors[rhs.type] ?? 1);
  }

  updateDistanceFactor(lhs: AtomInterface, rhs: AtomInterface): void {
    const mults = this.TYPES_CONFIG.LINK_FACTOR_DISTANCE[rhs.type][lhs.type];
    for (let i=0; i<mults.length; ++i) {
      lhs.linkDistanceFactors[i] *= mults[i];
    }
  }

  updateElasticFactor(lhs: AtomInterface, rhs: AtomInterface): void {
    const mults = this.TYPES_CONFIG.LINK_FACTOR_ELASTIC[rhs.type][lhs.type];
    for (let i=0; i<mults.length; ++i) {
      lhs.linkElasticFactors[i] *= mults[i];
    }
  }

  updateAtomType(atom: AtomInterface): void {
    if (!atom.isTypeChanged) {
      return;
    }

    const bondMap = atom.bonds.getStorage();
    for (const i in bondMap) {
      bondMap[i].bonds.update(atom);
    }

    atom.type = atom.newType as number;
    atom.newType = undefined;
  }

  private normalizeForce(value: number): number {
    if (Math.abs(value) > this.WORLD_CONFIG.MAX_FORCE) {
      return Math.sign(value) * this.WORLD_CONFIG.MAX_FORCE * this.WORLD_CONFIG.SPEED;
    }

    return value * this.WORLD_CONFIG.SPEED;
  }

  private handleBounds(atom: AtomInterface): void {
    const viewModeConfig = getViewModeConfig(this.WORLD_CONFIG, this.VIEW_MODE);
    for (let i = 0; i < atom.position.length; ++i) {
      if (atom.position[i] < viewModeConfig.BOUNDS.MIN_POSITION[i]) {
        atom.speed[i] += this.normalizeForce(
          this.physicModel.getBoundsForce(viewModeConfig.BOUNDS.MIN_POSITION[i] - atom.position[i])
        );
      } else if (atom.position[i] > viewModeConfig.BOUNDS.MAX_POSITION[i]) {
        atom.speed[i] -= this.normalizeForce(
          this.physicModel.getBoundsForce(atom.position[i] - viewModeConfig.BOUNDS.MAX_POSITION[i])
        );
      }
    }
  }

  private handleTemperature(atom: AtomInterface): void {
    if (isEqual(this.WORLD_CONFIG.TEMPERATURE_MULTIPLIER, 0)) {
      return;
    }
    if (this.tempVector.length !== atom.position.length) {
      this.tempVector = new Vector(new Array(atom.position.length).fill(0));
    }
    const func = this.WORLD_CONFIG.TEMPERATURE_FUNCTION;
    const mult = this.WORLD_CONFIG.TEMPERATURE_MULTIPLIER;
    this.tempVector.random().normalize().mul(mult * func(atom.position, this.time));
    atom.speed.add(this.tempVector);
  }

  private handleLinkInfluence(
    lhs: AtomInterface,
    rhs: AtomInterface,
    dist2: number,
    distVector: VectorInterface,
    elasticFactor: number,
  ): void {
    const force = this.physicModel.getLinkForce(lhs, rhs, dist2, elasticFactor);
    lhs.speed.add(distVector.normalize().mul(this.normalizeForce(force)));
  }

  private getDist2(distVector: NumericVector): number {
    let dist = 0;
    for (let i = 0; i < distVector.length; ++i) {
      dist += distVector[i] ** 2;
    }
    return dist;
  }

  private fillDistVector(lhs: AtomInterface, rhs: AtomInterface, out: VectorInterface): void {
    if (out.length !== lhs.position.length) {
      out.set(new Array(lhs.position.length).fill(0));
    }
    for (let i = 0; i < lhs.position.length; ++i) {
      out[i] = rhs.position[i] - lhs.position[i];
    }
  }
}
