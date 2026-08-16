import type {
  LinksPoolInterface,
  LinkManagerInterface,
  RulesHelperInterface,
  LinkSwapPlan,
  LinkUpgradePlan,
  GeometryHelperInterface,
  QueueInterface,
  RunningStateInterface,
} from '../simulation/types/utils';
import type { AtomInterface, LinkInterface } from '../simulation/types/atomic';
import type {
  WorldConfig,
  TypesConfig,
} from '../config/types';
import { decodeTransformType, isMergeTransform } from '../config/types';
import { typeLinkLimit } from '../config/bond-limits';
import { arrayBinaryOperation, arrayUnaryOperation } from '../math';
import { typeMass } from '../config/mass';
import { Link } from '../simulation/atomic';

class LinkPool implements LinksPoolInterface {
  private storage: LinkInterface[] = [];

  allocate(lhs: AtomInterface, rhs: AtomInterface): LinkInterface {
    if (this.storage.length) {
      const result = this.storage.pop() as LinkInterface;
      result.lhs = lhs;
      result.rhs = rhs;
      result.order = 1;
      return result;
    }
    return new Link(lhs, rhs);
  }

  free(link: LinkInterface): void {
    this.storage.push(link);
  }
}

export class LinkManager implements LinkManagerInterface {
  private storage: Set<LinkInterface> = new Set();
  private pool: LinksPoolInterface = new LinkPool();

  get length(): number {
    return this.storage.size;
  }

  create(lhs: AtomInterface, rhs: AtomInterface, order: number = 1): LinkInterface {
    const link = this.pool.allocate(lhs, rhs);
    link.order = order;
    lhs.bonds.add(rhs, order);
    rhs.bonds.add(lhs, order);
    this.storage.add(link);
    return link;
  }

  setOrder(link: LinkInterface, order: number): void {
    link.order = order;
    link.lhs.bonds.setOrder(link.rhs, order);
    link.rhs.bonds.setOrder(link.lhs, order);
  }

  delete(link: LinkInterface): void {
    link.lhs.bonds.delete(link.rhs);
    link.rhs.bonds.delete(link.lhs);
    this.storage.delete(link);
    this.pool.free(link);
  }

  find(lhs: AtomInterface, rhs: AtomInterface): LinkInterface | undefined {
    for (const link of this.storage) {
      if (
        (link.lhs === lhs && link.rhs === rhs)
        || (link.lhs === rhs && link.rhs === lhs)
      ) {
        return link;
      }
    }
    return undefined;
  }

  clear(): void {
    this.storage.clear();
  }

  has(link: LinkInterface): boolean {
    return this.storage.has(link);
  }

  * [Symbol.iterator](): Iterator<LinkInterface> {
    for (const item of this.storage) {
      yield item;
    }
  }
}

export class RulesHelper implements RulesHelperInterface {
  private TYPES_CONFIG: TypesConfig;
  private WORLD_CONFIG: WorldConfig;

  constructor(worldConfig: WorldConfig, typesConfig: TypesConfig) {
    this.TYPES_CONFIG = typesConfig;
    this.WORLD_CONFIG = worldConfig;
  }

  canLink(lhs: AtomInterface, rhs: AtomInterface): boolean {
    return this._canLink(lhs, rhs) && this._canLink(rhs, lhs);
  }

  getLinkOrder(lhs: AtomInterface, rhs: AtomInterface): number {
    const nominal = Math.min(
      this._nominalWeight(lhs.type, rhs.type),
      this._nominalWeight(rhs.type, lhs.type),
    );
    return Math.min(nominal, this._freeValence(lhs), this._freeValence(rhs));
  }

  getLinkSwapPlan(lhs: AtomInterface, rhs: AtomInterface): LinkSwapPlan | null {
    if (this.canLink(lhs, rhs)) {
      return { breakLhsWith: [], breakRhsWith: [] };
    }

    let breakLhsWith: AtomInterface[] = [];
    let breakRhsWith: AtomInterface[] = [];

    if (!this._canLink(lhs, rhs)) {
      const victims = this._findVictimsForSwap(lhs, rhs);
      if (!victims) {
        return null;
      }
      breakLhsWith = victims;
    }

    if (!this._canLink(rhs, lhs)) {
      const victims = this._findVictimsForSwap(rhs, lhs);
      if (!victims) {
        return null;
      }
      breakRhsWith = victims;
    }

    return { breakLhsWith, breakRhsWith };
  }

  getLinkUpgradePlan(link: LinkInterface): LinkUpgradePlan | null {
    const { lhs, rhs, order } = link;
    const nominal = Math.min(
      this._nominalWeight(lhs.type, rhs.type),
      this._nominalWeight(rhs.type, lhs.type),
    );
    if (order >= nominal) {
      return null;
    }

    const target = Math.min(
      this._maxUpgradeableOrder(lhs, rhs, nominal),
      this._maxUpgradeableOrder(rhs, lhs, nominal),
    );
    if (target <= order) {
      return null;
    }

    const breakLhsWith = this._findVictimsForUpgrade(lhs, rhs, target);
    if (!breakLhsWith) {
      return null;
    }
    const breakRhsWith = this._findVictimsForUpgrade(rhs, lhs, target);
    if (!breakRhsWith) {
      return null;
    }

    return { breakLhsWith, breakRhsWith, newOrder: target };
  }

  isLinkRedundant(lhs: AtomInterface, rhs: AtomInterface): boolean {
    return this._isLinkRedundant(lhs, rhs) || this._isLinkRedundant(rhs, lhs);
  }

  hasMergeTransform(lhs: AtomInterface, rhs: AtomInterface): boolean {
    return this._isMergeTransform(lhs, rhs) || this._isMergeTransform(rhs, lhs);
  }

  handleTransform(lhs: AtomInterface, rhs: AtomInterface): [number, number][] {
    return [
      ...this._handleTransform(lhs, rhs),
      ...this._handleTransform(rhs, lhs),
    ];
  }

  private _canLink(lhs: AtomInterface, rhs: AtomInterface): boolean {
    if (this._freeValence(lhs) < 1) {
      return false;
    }
    return lhs.bonds.lengthOf(rhs.type) < this._typeLinkLimit(lhs.type, rhs.type);
  }

  private _findVictimsForSwap(
    atom: AtomInterface,
    newPartner: AtomInterface,
  ): AtomInterface[] | null {
    const nominal = this._nominalWeight(atom.type, newPartner.type);
    const partnerFree = this._freeValence(newPartner);
    const needWeight = Math.min(nominal, partnerFree > 0 ? partnerFree : nominal);
    if (needWeight < 1) {
      return null;
    }

    const maxLinks = this.TYPES_CONFIG.LINKS[atom.type];
    const maxToType = this._typeLinkLimit(atom.type, newPartner.type);
    const newPref = this._bondPreference(atom, newPartner, needWeight);
    const factors = this.TYPES_CONFIG.BOND_PREFERENCE_FACTOR;

    const candidates = Object.values(atom.bonds.getStorage())
      .filter((partner) => partner !== newPartner)
      .filter((partner) => {
        const boost = factors?.[partner.type]?.[atom.type]?.[newPartner.type] ?? 1;
        return !(boost > 1);
      })
      .map((partner) => ({
        partner,
        preference: this._bondPreference(atom, partner, atom.bonds.getOrder(partner)),
      }))
      .filter(({ preference }) => newPref > preference)
      .sort((a, b) => a.preference - b.preference || a.partner.id - b.partner.id);

    let used = this._countWeightedBonds(atom);
    let countToNew = atom.bonds.lengthOf(newPartner.type);
    const victims: AtomInterface[] = [];

    const fits = () => maxLinks - used >= needWeight && countToNew < maxToType;
    if (fits()) {
      return [];
    }

    for (const { partner } of candidates) {
      used -= atom.bonds.getOrder(partner);
      if (partner.type === newPartner.type) {
        countToNew -= 1;
      }
      victims.push(partner);
      if (fits()) {
        return victims;
      }
    }

    return null;
  }

  private _maxUpgradeableOrder(atom: AtomInterface, partner: AtomInterface, nominal: number): number {
    const current = atom.bonds.getOrder(partner);
    const upgradePref = this._bondPreference(atom, partner, nominal);
    const factors = this.TYPES_CONFIG.BOND_PREFERENCE_FACTOR;
    let canGain = this._freeValence(atom);

    for (const other of Object.values(atom.bonds.getStorage())) {
      if (other === partner) {
        continue;
      }
      const boost = factors?.[other.type]?.[atom.type]?.[partner.type] ?? 1;
      if (boost > 1) {
        continue;
      }
      const preference = this._bondPreference(atom, other, atom.bonds.getOrder(other));
      if (upgradePref > preference) {
        canGain += atom.bonds.getOrder(other);
      }
    }

    return Math.min(nominal, current + canGain);
  }

  private _findVictimsForUpgrade(
    atom: AtomInterface,
    partner: AtomInterface,
    target: number,
  ): AtomInterface[] | null {
    const needExtra = target - atom.bonds.getOrder(partner);
    if (needExtra <= 0) {
      return [];
    }

    let free = this._freeValence(atom);
    if (free >= needExtra) {
      return [];
    }

    const upgradePref = this._bondPreference(atom, partner, target);
    const factors = this.TYPES_CONFIG.BOND_PREFERENCE_FACTOR;
    const candidates = Object.values(atom.bonds.getStorage())
      .filter((other) => other !== partner)
      .filter((other) => {
        const boost = factors?.[other.type]?.[atom.type]?.[partner.type] ?? 1;
        return !(boost > 1);
      })
      .map((other) => ({
        other,
        preference: this._bondPreference(atom, other, atom.bonds.getOrder(other)),
      }))
      .filter(({ preference }) => upgradePref > preference)
      .sort((a, b) => a.preference - b.preference || a.other.id - b.other.id);

    const victims: AtomInterface[] = [];
    for (const { other } of candidates) {
      free += atom.bonds.getOrder(other);
      victims.push(other);
      if (free >= needExtra) {
        return victims;
      }
    }

    return null;
  }

  private _bondPreference(atom: AtomInterface, partner: AtomInterface, order: number): number {
    const matrix = this.TYPES_CONFIG.BOND_PREFERENCE;
    let preference = (matrix?.[atom.type]?.[partner.type] ?? 0) * order;
    const factors = this.TYPES_CONFIG.BOND_PREFERENCE_FACTOR;
    if (!factors) {
      return preference;
    }

    const agents = new Set<number>();
    for (const neighbor of Object.values(atom.bonds.getStorage())) {
      if (neighbor !== partner) {
        agents.add(neighbor.type);
      }
    }
    for (const neighbor of Object.values(partner.bonds.getStorage())) {
      if (neighbor !== atom) {
        agents.add(neighbor.type);
      }
    }

    for (const agentType of agents) {
      preference *= factors[agentType]?.[atom.type]?.[partner.type] ?? 1;
    }
    return preference;
  }

  private _isLinkRedundant(lhs: AtomInterface, rhs: AtomInterface): boolean {
    if (this._countWeightedBonds(lhs) > this.TYPES_CONFIG.LINKS[lhs.type]) {
      return true;
    }
    return lhs.bonds.lengthOf(rhs.type) > this._typeLinkLimit(lhs.type, rhs.type);
  }

  private _isMergeTransform(lhs: AtomInterface, rhs: AtomInterface): boolean {
    if (!this._issetTransformation(lhs, rhs)) {
      return false;
    }
    return isMergeTransform(this.TYPES_CONFIG.TRANSFORMATION[lhs.type][rhs.type]);
  }

  private _handleTransform(lhs: AtomInterface, rhs: AtomInterface): [number, number][] {
    if (lhs.toDelete || rhs.toDelete || !this._issetTransformation(lhs, rhs)) {
      return [];
    }
    const raw = this.TYPES_CONFIG.TRANSFORMATION[lhs.type][rhs.type];
    const newType = decodeTransformType(raw);
    if (newType !== lhs.type) {
      lhs.newType = newType;
    }
    if (isMergeTransform(raw)) {
      const massLhs = typeMass(this.TYPES_CONFIG, lhs.type);
      const massRhs = typeMass(this.TYPES_CONFIG, rhs.type);
      const massSum = massLhs + massRhs || 1;
      for (let i = 0; i < lhs.position.length; ++i) {
        lhs.position[i] = (lhs.position[i] * massLhs + rhs.position[i] * massRhs) / massSum;
        lhs.speed[i] = (lhs.speed[i] * massLhs + rhs.speed[i] * massRhs) / massSum;
      }
      rhs.toDelete = true;
    }
    return [[lhs.type, newType]];
  }

  private _issetTransformation(lhs: AtomInterface, rhs: AtomInterface): boolean {
    const transforms = this.TYPES_CONFIG.TRANSFORMATION;
    if (!transforms) {
      return false;
    }
    return transforms[lhs.type] !== undefined
      && transforms[lhs.type][rhs.type] !== undefined;
  }

  private _nominalWeight(fromType: number, toType: number): number {
    return Math.max(1, Math.round(this.TYPES_CONFIG.TYPE_LINK_WEIGHTS[fromType][toType] ?? 1));
  }

  private _typeLinkLimit(fromType: number, toType: number): number {
    return typeLinkLimit(
      this.TYPES_CONFIG.LINKS[fromType],
      this.TYPES_CONFIG.TYPE_LINK_WEIGHTS[fromType][toType] ?? 1,
    );
  }

  private _freeValence(atom: AtomInterface): number {
    return this.TYPES_CONFIG.LINKS[atom.type] - this._countWeightedBonds(atom);
  }

  private _countWeightedBonds(atom: AtomInterface): number {
    return atom.bonds.getTotalOrder();
  }
}

export class GeometryHelper implements GeometryHelperInterface {
  private WORLD_CONFIG: WorldConfig;
  private TYPES_CONFIG: TypesConfig;

  constructor(worldConfig: WorldConfig, typesConfig: TypesConfig) {
    this.WORLD_CONFIG = worldConfig;
    this.TYPES_CONFIG = typesConfig;
  }

  getAtomRadius(atom: AtomInterface): number {
    return this.WORLD_CONFIG.ATOM_RADIUS * this.TYPES_CONFIG.RADIUS[atom.type];
  }

  getAtomsRadiusSum(lhs: AtomInterface, rhs: AtomInterface): number {
    return this.getAtomRadius(lhs) + this.getAtomRadius(rhs);
  }

  getMassMultiplier(lhs: AtomInterface, _rhs: AtomInterface): number {
    return 1 / typeMass(this.TYPES_CONFIG, lhs.type);
  }
}

export class Queue<T extends number | number[]> implements QueueInterface<T> {
  private readonly maxSize?: number;
  private storage: T[] = [];

  constructor(maxSize?: number) {
    this.maxSize = maxSize;
  }

  first(): T | undefined {
    return this.storage[0] ?? undefined;
  }

  last(): T | undefined {
    return this.storage[this.storage.length-1] ?? undefined;
  }

  mean(): T | undefined {
    if (this.storage.length === 0) {
      return undefined;
    }

    if (this.storage[0] instanceof Array) {
      const sum = (this.storage as number[][]).reduce(
        (acc, x) => arrayBinaryOperation<number>(acc, x, (a, b) => a + b)
      );
      return arrayUnaryOperation(sum, (x) => x / this.storage.length) as T;
    }

    return (this.storage.reduce((acc, x) => acc + (x as number), 0) / this.storage.length) as T;
  }

  pop(): T | undefined {
    const result = this.storage[0] ?? undefined;
    this.storage = this.storage.slice(1);
    return result;
  }

  push(value: T): void {
    if (this.maxSize !== undefined && this.storage.length === this.maxSize) {
      this.pop();
    }
    this.storage.push(value);
  }
}

export class RunningState implements RunningStateInterface {
  private _isRunning = false;
  private _isRunningConfirmed = false;
  private _isPaused = false;

  get isRunning(): boolean {
    return this._isRunning;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  start() {
    if (this._isRunningConfirmed) {
      return;
    }
    this._isRunning = true;
    this._isRunningConfirmed = true;
  }

  async stop() {
    this._isRunning = false;
    await this.waitUntil(() => !this._isRunningConfirmed);
  }

  togglePause() {
    this._isPaused = !this._isPaused;
  }

  confirmStart() {
    this._isRunningConfirmed = true;
  }

  confirmStop() {
    this._isRunningConfirmed = false;
  }

  private async waitUntil(condition: () => boolean) {
    return await new Promise(resolve => {
      const interval = setInterval(() => {
        if (condition()) {
          resolve(null);
          clearInterval(interval);
        }
      }, 0);
    });
  }
}
