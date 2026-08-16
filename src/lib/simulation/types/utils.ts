import type { AtomInterface, LinkInterface } from './atomic';

export interface LinksPoolInterface {
  allocate(lhs: AtomInterface, rhs: AtomInterface): LinkInterface;
  free(link: LinkInterface): void;
}

export interface LinkManagerInterface extends Iterable<LinkInterface> {
  length: number;
  create(lhs: AtomInterface, rhs: AtomInterface, order?: number): LinkInterface;
  setOrder(link: LinkInterface, order: number): void;
  delete(link: LinkInterface): void;
  find(lhs: AtomInterface, rhs: AtomInterface): LinkInterface | undefined;
  clear(): void;
  has(link: LinkInterface): boolean;
}

export type LinkSwapPlan = {
  breakLhsWith: AtomInterface[];
  breakRhsWith: AtomInterface[];
};

export type LinkUpgradePlan = {
  breakLhsWith: AtomInterface[];
  breakRhsWith: AtomInterface[];
  newOrder: number;
};

export interface RulesHelperInterface {
  prepareTick(): void;
  canLink(lhs: AtomInterface, rhs: AtomInterface): boolean;
  getLinkOrder(lhs: AtomInterface, rhs: AtomInterface): number;
  getLinkSwapPlan(lhs: AtomInterface, rhs: AtomInterface): LinkSwapPlan | null;
  getLinkUpgradePlan(link: LinkInterface): LinkUpgradePlan | null;
  isLinkRedundant(lhs: AtomInterface, rhs: AtomInterface): boolean;
  hasMergeTransform(lhs: AtomInterface, rhs: AtomInterface): boolean;
  handleTransform(lhs: AtomInterface, rhs: AtomInterface): [number, number][];
}

export interface GeometryHelperInterface {
  prepareTick(): void;
  getAtomRadius(atom: AtomInterface): number;
  getAtomsRadiusSum(lhs: AtomInterface, rhs: AtomInterface): number;
  getMassMultiplier(lhs: AtomInterface, rhs: AtomInterface): number;
}

export interface QueueInterface<T> {
  push(value: T): void;
  pop(): T | undefined;
  first(): T | undefined;
  last(): T | undefined;
  mean(): T | undefined;
}

export interface RunningStateInterface {
  isRunning: boolean;
  isPaused: boolean;
  start(): void;
  stop(): Promise<void>;
  togglePause(): void;
  confirmStart(): void;
  confirmStop(): void;
}
