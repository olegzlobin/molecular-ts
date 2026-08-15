import type {
  AtomInterface,
  BondMapInterface,
  LinkInterface,
} from './types/atomic';
import type { NumericVector, VectorInterface } from '../math/types';
import type { SpatialGridCellInterface } from './types/spatial';
import { toVector } from '../math';

class BondMap implements BondMapInterface {
  private storage: Record<number, AtomInterface> = {};
  private orders: Record<number, number> = {};
  private typesCount: Record<number, number> = {};
  private count: number = 0;
  private totalOrder: number = 0;

  get length(): number {
    return this.count;
  }

  lengthOf(type: number): number {
    return this.typesCount[type] ?? 0;
  }

  has(atom: AtomInterface): boolean {
    return this.storage.hasOwnProperty(atom.id);
  }

  add(atom: AtomInterface, order: number = 1): void {
    this.storage[atom.id] = atom;
    this.orders[atom.id] = order;
    this.totalOrder += order;
    if (!this.typesCount.hasOwnProperty(atom.type)) {
      this.typesCount[atom.type] = 0;
    }
    this.typesCount[atom.type]++;
    this.count++;
  }

  delete(atom: AtomInterface): void {
    this.totalOrder -= this.orders[atom.id] ?? 0;
    delete this.storage[atom.id];
    delete this.orders[atom.id];
    this.typesCount[atom.type]--;
    this.count--;
  }

  update(atom: AtomInterface): void {
    const newType = atom.newType as number;
    if (atom.isTypeChanged) {
      if (!this.typesCount.hasOwnProperty(newType)) {
        this.typesCount[newType] = 0;
      }
      this.typesCount[atom.type]--;
      this.typesCount[newType]++;

      if (this.typesCount[atom.type] < 0 || this.typesCount[newType] < 0) {
        console.warn('error', this.typesCount[atom.type], this.typesCount[newType]);
      }
    }
  }

  getOrder(atom: AtomInterface): number {
    return this.orders[atom.id] ?? 0;
  }

  getTotalOrder(): number {
    return this.totalOrder;
  }

  getTypesCountMap(): Record<number, number> {
    return this.typesCount;
  }

  getStorage(): Record<number, AtomInterface> {
    return this.storage;
  }
}

export class Atom implements AtomInterface {
  readonly id: number;
  readonly position: VectorInterface;
  readonly speed: VectorInterface;
  readonly bonds: BondMapInterface;
  type: number;
  newType: number | undefined = undefined;
  toDelete: boolean = false;
  linkBanWith?: number;
  spatialGridCell?: SpatialGridCellInterface;

  constructor(id: number, type: number, position: NumericVector, speed?: NumericVector) {
    this.id = id;
    this.type = type;
    this.position = toVector(position);
    this.speed = speed ? toVector(speed) : toVector(new Array<number>(position.length).fill(0));
    this.bonds = new BondMap();
  }

  get isTypeChanged(): boolean {
    return this.newType !== undefined && this.type !== this.newType;
  }

  exportState(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      position: [...this.position],
      speed: [...this.speed],
    };
  }
}

export class Link implements LinkInterface {
  lhs: AtomInterface;
  rhs: AtomInterface;
  order: number;

  constructor(lhs: AtomInterface, rhs: AtomInterface, order: number = 1) {
    this.lhs = lhs;
    this.rhs = rhs;
    this.order = order;
  }

  get id(): string {
    return `${this.lhs.id}-${this.rhs.id}`;
  }

  exportState(): number[] {
    return [this.lhs.id, this.rhs.id, this.order];
  }
}
