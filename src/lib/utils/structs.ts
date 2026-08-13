import type {
  LinksPoolInterface,
  LinkManagerInterface,
  RulesHelperInterface,
  LinkSwapPlan,
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
import { arrayBinaryOperation, arrayUnaryOperation } from '../math';
import { Link } from '../simulation/atomic';

class LinkPool implements LinksPoolInterface {
  private storage: LinkInterface[] = [];

  allocate(lhs: AtomInterface, rhs: AtomInterface): LinkInterface {
    if (this.storage.length) {
      const result = this.storage.pop() as LinkInterface;
      result.lhs = lhs;
      result.rhs = rhs;
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

  create(lhs: AtomInterface, rhs: AtomInterface): LinkInterface {
    const link = this.pool.allocate(lhs, rhs);
    lhs.bonds.add(rhs);
    rhs.bonds.add(lhs);
    this.storage.add(link);
    return link;
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
    const weight = this.TYPES_CONFIG.TYPE_LINK_WEIGHTS[lhs.type][rhs.type];
    if (this.TYPES_CONFIG.LINKS[lhs.type] - this._countWeightedBonds(lhs) < weight) {
      return false;
    }
    return lhs.bonds.lengthOf(rhs.type) < this.TYPES_CONFIG.TYPE_LINKS[lhs.type][rhs.type];
  }

  private _findVictimsForSwap(
    atom: AtomInterface,
    newPartner: AtomInterface,
  ): AtomInterface[] | null {
    const weights = this.TYPES_CONFIG.TYPE_LINK_WEIGHTS[atom.type];
    const needWeight = weights[newPartner.type];
    const maxLinks = this.TYPES_CONFIG.LINKS[atom.type];
    const maxToType = this.TYPES_CONFIG.TYPE_LINKS[atom.type][newPartner.type];
    const newPref = this._bondPreference(atom, newPartner);
    const factors = this.TYPES_CONFIG.BOND_PREFERENCE_FACTOR;

    const candidates = Object.values(atom.bonds.getStorage())
      .filter((partner) => partner !== newPartner)
      .filter((partner) => {
        const boost = factors?.[partner.type]?.[atom.type]?.[newPartner.type] ?? 1;
        return !(boost > 1);
      })
      .map((partner) => ({
        partner,
        preference: this._bondPreference(atom, partner),
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
      used -= weights[partner.type];
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

  private _bondPreference(atom: AtomInterface, partner: AtomInterface): number {
    const matrix = this.TYPES_CONFIG.BOND_PREFERENCE;
    let preference = matrix?.[atom.type]?.[partner.type] ?? 0;
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
    return lhs.bonds.lengthOf(rhs.type) > this.TYPES_CONFIG.TYPE_LINKS[lhs.type][rhs.type];
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
      const massLhs = this.TYPES_CONFIG.RADIUS[lhs.type] ** 3;
      const massRhs = this.TYPES_CONFIG.RADIUS[rhs.type] ** 3;
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

  private _countWeightedBonds(atom: AtomInterface): number {
    let result = 0;
    const typesCountMap = atom.bonds.getTypesCountMap();
    for (const type in typesCountMap) {
      result += this.TYPES_CONFIG.TYPE_LINK_WEIGHTS[atom.type][type] * typesCountMap[type];
    }
    return result;
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
    const mass = this.TYPES_CONFIG.RADIUS[lhs.type] ** 3;
    return mass > 0 ? 1 / mass : 1;
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
