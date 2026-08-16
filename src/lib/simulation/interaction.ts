import type { WorldConfig, TypesConfig, ViewMode } from '../config/types';
import type { LinkManagerInterface, RulesHelperInterface } from './types/utils';
import type { AtomInterface, LinkInterface } from './types/atomic';
import type { NumericVector, VectorInterface } from '../math/types';
import type { InteractionManagerInterface } from './types/interaction';
import type { PhysicModelInterface } from './types/interaction';
import { isEqual, Vector } from '../math';
import { getViewModeConfig } from '../utils/functions';
import { linkStrengthFactor, isUnitFactorTensor } from '../utils/link-strength';
import type { SummaryManagerInterface } from '../analysis/types';

export class InteractionManager implements InteractionManagerInterface {
  private readonly VIEW_MODE: ViewMode;
  private readonly WORLD_CONFIG: WorldConfig;
  private readonly TYPES_CONFIG: TypesConfig;
  private readonly linkManager: LinkManagerInterface;
  private readonly ruleHelper: RulesHelperInterface;
  private readonly summaryManager: SummaryManagerInterface;
  private readonly onLinkBreak?: (link: LinkInterface) => void;
  private physicModel: PhysicModelInterface;
  private time: number;
  private bufVector: VectorInterface = new Vector([0, 0]);
  private tempVector: VectorInterface = new Vector([0, 0]);
  private readonly gravityOut: [number, number] = [0, 0];
  private interactionRadius2 = 0;
  private linkRadius2Coarse = 0;
  private linkStrengthUnit = true;
  private maxLinkRadius = 0;

  constructor(
    viewMode: ViewMode,
    worldConfig: WorldConfig,
    typesConfig: TypesConfig,
    linkManager: LinkManagerInterface,
    physicModel: PhysicModelInterface,
    ruleHelper: RulesHelperInterface,
    summaryManager: SummaryManagerInterface,
    onLinkBreak?: (link: LinkInterface) => void,
  ) {
    this.VIEW_MODE = viewMode;
    this.WORLD_CONFIG = worldConfig;
    this.TYPES_CONFIG = typesConfig;
    this.linkManager = linkManager;
    this.physicModel = physicModel;
    this.ruleHelper = ruleHelper;
    this.summaryManager = summaryManager;
    this.onLinkBreak = onLinkBreak;
    this.time = 0;
    this.prepareTick();
  }

  prepareTick(): void {
    const maxInteraction = this.WORLD_CONFIG.MAX_INTERACTION_RADIUS;
    this.interactionRadius2 = maxInteraction * maxInteraction;
    this.maxLinkRadius = this.WORLD_CONFIG.MAX_LINK_RADIUS;
    let maxLength = 1;
    const lengths = this.TYPES_CONFIG.LINK_LENGTH;
    if (lengths) {
      for (let i = 0; i < lengths.length; ++i) {
        if (lengths[i] > maxLength) {
          maxLength = lengths[i];
        }
      }
    }
    const coarse = this.maxLinkRadius * maxLength;
    this.linkRadius2Coarse = coarse * coarse;
    this.linkStrengthUnit = isUnitFactorTensor(this.TYPES_CONFIG.LINK_STRENGTH_FACTOR);
    this.ruleHelper.prepareTick();
    this.physicModel.geometry.prepareTick();
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
      dist2 >= (this.WORLD_CONFIG.MAX_LINK_RADIUS * this.getPairLinkLengthFactor(link.lhs, link.rhs)) ** 2
      || dist2 > this.WORLD_CONFIG.MAX_INTERACTION_RADIUS ** 2
      || this.ruleHelper.isLinkRedundant(link.lhs, link.rhs)
    ) {
      this.deleteLink(link);
      return;
    }

    const upgrade = this.ruleHelper.getLinkUpgradePlan(link);
    if (upgrade) {
      for (const victim of upgrade.breakLhsWith) {
        const broken = this.linkManager.find(link.lhs, victim);
        if (broken) {
          this.deleteLink(broken);
        }
      }
      for (const victim of upgrade.breakRhsWith) {
        const broken = this.linkManager.find(link.rhs, victim);
        if (broken) {
          this.deleteLink(broken);
        }
      }
      this.linkManager.setOrder(link, upgrade.newOrder);
    }

    const radiusSum = this.physicModel.geometry.getAtomsRadiusSum(link.lhs, link.rhs);
    if (dist2 <= radiusSum ** 2) {
      return;
    }

    const elasticFactor = this.getElasticFactor(link.lhs, link.rhs);
    this.handleLinkInfluence(link.lhs, link.rhs, dist2, this.bufVector, elasticFactor);
    this.handleLinkInfluence(link.rhs, link.lhs, dist2, this.bufVector.inverse(), elasticFactor);
  }

  interactAtoms(lhs: AtomInterface, rhs: AtomInterface): void {
    if (lhs === rhs || lhs.toDelete || rhs.toDelete) {
      return;
    }

    this.fillDistVector(lhs, rhs, this.bufVector);
    const dist2 = this.getDist2(this.bufVector);

    if (dist2 > this.interactionRadius2) {
      return;
    }

    if (dist2 > 0) {
      const forces = this.physicModel.getGravityForces(lhs, rhs, dist2, this.gravityOut);
      const rawLhs = forces[0];
      const rawRhs = forces[1];
      if (rawLhs !== 0 || rawRhs !== 0) {
        const forceLhs = this.normalizeForce(rawLhs);
        const forceRhs = this.normalizeForce(rawRhs);
        const invDist = 1 / Math.sqrt(dist2);
        for (let i = 0; i < this.bufVector.length; ++i) {
          const dir = this.bufVector[i] * invDist;
          lhs.speed[i] += dir * forceLhs;
          rhs.speed[i] -= dir * forceRhs;
        }
      }
    }

    const banned = lhs.linkBanWith === rhs.id || rhs.linkBanWith === lhs.id;
    const bonded = lhs.bonds.has(rhs);
    if (bonded && !banned) {
      return;
    }
    if (!banned && dist2 > this.linkRadius2Coarse) {
      return;
    }

    const linkRadius2 = (this.maxLinkRadius * this.getPairLinkLengthFactor(lhs, rhs)) ** 2;

    if (banned) {
      if (dist2 > linkRadius2) {
        if (lhs.linkBanWith === rhs.id) {
          lhs.linkBanWith = undefined;
        }
        if (rhs.linkBanWith === lhs.id) {
          rhs.linkBanWith = undefined;
        }
      } else if (
        !bonded &&
        this.ruleHelper.canLink(lhs, rhs)
      ) {
        return;
      }
    }

    if (
      !bonded &&
      dist2 <= linkRadius2
    ) {
      const swapPlan = this.ruleHelper.getLinkSwapPlan(lhs, rhs);
      if (!swapPlan) {
        return;
      }

      if (this.ruleHelper.hasMergeTransform(lhs, rhs)) {
        const radiusSum = this.physicModel.geometry.getAtomsRadiusSum(lhs, rhs);
        if (dist2 > radiusSum ** 2) {
          return;
        }
      }

      for (const victim of swapPlan.breakLhsWith) {
        const broken = this.linkManager.find(lhs, victim);
        if (broken) {
          this.deleteLink(broken);
        }
      }
      for (const victim of swapPlan.breakRhsWith) {
        const broken = this.linkManager.find(rhs, victim);
        if (broken) {
          this.deleteLink(broken);
        }
      }

      const order = this.ruleHelper.getLinkOrder(lhs, rhs);
      if (order < 1) {
        return;
      }

      const link = this.linkManager.create(lhs, rhs, order);

      const transformations = this.ruleHelper.handleTransform(lhs, rhs);
      for (const transformation of transformations) {
        this.summaryManager.noticeTransformation(...transformation);
      }

      this.summaryManager.noticeLinkCreated(link, this.WORLD_CONFIG);
    }
  }

  setPhysicModel(model: PhysicModelInterface): void {
    this.physicModel = model;
    this.prepareTick();
  }

  getPairLinkLengthFactor(lhs: AtomInterface, rhs: AtomInterface): number {
    const lengths = this.TYPES_CONFIG.LINK_LENGTH;
    const base = ((lengths?.[lhs.type] ?? 1) + (lengths?.[rhs.type] ?? 1)) / 2;
    if (this.linkStrengthUnit) {
      return base;
    }
    return base * linkStrengthFactor(this.TYPES_CONFIG, lhs, rhs);
  }

  getElasticFactor(lhs: AtomInterface, rhs: AtomInterface): number {
    const stiffness = this.TYPES_CONFIG.LINK_STIFFNESS;
    const base = ((stiffness?.[lhs.type] ?? 1) + (stiffness?.[rhs.type] ?? 1)) / 2;
    if (this.linkStrengthUnit) {
      return base;
    }
    return base * linkStrengthFactor(this.TYPES_CONFIG, lhs, rhs);
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

  private deleteLink(link: LinkInterface): void {
    this.linkManager.delete(link);
    this.summaryManager.noticeLinkDeleted(link, this.WORLD_CONFIG);
    this.onLinkBreak?.(link);
  }
}
