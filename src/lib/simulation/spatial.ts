import type { AtomInterface } from './types/atomic';
import type { NumericVector } from '../math/types';
import type { SpatialGridCellInterface, SpatialGridManagerManagerInterface, SpatialGridInterface } from './types/spatial';

// Cell coords stay in a practical range for this sim; pack into one number for Map keys.
const PACK2_BIAS = 32768;
const PACK3_BIAS = 1024;
const PACK3_STRIDE = 2048;

function packKey2(x: number, y: number): number {
  return ((x + PACK2_BIAS) << 16) | (y + PACK2_BIAS);
}

function packKey3(x: number, y: number, z: number): number {
  return ((x + PACK3_BIAS) * PACK3_STRIDE + (y + PACK3_BIAS)) * PACK3_STRIDE + (z + PACK3_BIAS);
}

function incPoint(aPoint: NumericVector, aCenterPoint: NumericVector, aDim: number): boolean {
  aPoint[aDim]++;
  if (aPoint[aDim] > aCenterPoint[aDim] + 1) {
    if (aDim == aPoint.length - 1) {
      return false;
    }
    aPoint[aDim] = aCenterPoint[aDim] - 1;
    return incPoint(aPoint, aCenterPoint, aDim + 1);
  }
  return true;
}

function getNeighboursCoords(coords: NumericVector): Iterable<NumericVector> {
  const curPoint: NumericVector = new Array<number>(coords.length);
  for (let i = 0; i < curPoint.length; ++i) {
    curPoint[i] = coords[i] - 1;
  }
  const result = [];
  do {
    result.push([...curPoint]);
  } while (incPoint(curPoint, coords, 0));
  return result;
}

class SpatialGridCell implements SpatialGridCellInterface {
  atoms: Set<AtomInterface> = new Set<AtomInterface>();
  coords: NumericVector;
  readonly key: number;

  constructor(key: number, coords: NumericVector) {
    this.key = key;
    this.coords = coords;
  }

  get length(): number {
    return this.atoms.size;
  }

  add(atom: AtomInterface): void {
    this.atoms.add(atom);
  }

  remove(atom: AtomInterface): void {
    this.atoms.delete(atom);
  }

  empty(): boolean {
    return this.atoms.size === 0;
  }

  [Symbol.iterator](): IterableIterator<AtomInterface> {
    return this.atoms.values();
  }
}

class SpatialGrid implements SpatialGridInterface {
  map: Map<number, SpatialGridCell> = new Map();
  quantum: number;
  phase: number;
  private readonly coordBuf: number[] = [];

  constructor(quantum: number, phase: number = 0) {
    this.quantum = quantum;
    this.phase = phase;
  }

  getNeighbourhood(atom: AtomInterface): SpatialGridCellInterface[] {
    const result = [];
    const currentCell = this.handleAtom(atom);
    for (const coords of getNeighboursCoords(currentCell.coords)) {
      const cell = this.getCellIfExists(coords);
      if (cell) {
        result.push(cell);
      }
    }
    return result;
  }

  countAtoms(): number {
    let result = 0;
    for (const [, cell] of this.map) {
      result += cell.length;
    }
    return result;
  }

  clear(): void {
    this.map.clear();
  }

  public handleAtom(atom: AtomInterface): SpatialGridCellInterface {
    const actualCell = this.getCellByAtom(atom);
    const currentCell = atom.spatialGridCell;

    if (actualCell !== currentCell) {
      if (currentCell !== undefined) {
        this.detachFromCell(atom, currentCell);
      }
      actualCell.add(atom);
      atom.spatialGridCell = actualCell;
    }

    return actualCell;
  }

  public detachAtom(atom: AtomInterface): void {
    const cell = atom.spatialGridCell;
    if (cell === undefined) {
      return;
    }
    this.detachFromCell(atom, cell);
    atom.spatialGridCell = undefined;
  }

  private detachFromCell(atom: AtomInterface, cell: SpatialGridCellInterface): void {
    cell.remove(atom);
    if (cell.empty()) {
      this.map.delete((cell as SpatialGridCell).key);
    }
  }

  public getCell(cellCoords: NumericVector): SpatialGridCellInterface {
    if (cellCoords.length === 2) {
      return this.getCell2(cellCoords[0], cellCoords[1]);
    }
    if (cellCoords.length === 3) {
      return this.getCell3(cellCoords[0], cellCoords[1], cellCoords[2]);
    }
    throw new Error(`Unsupported spatial dimensions: ${cellCoords.length}`);
  }

  public getCell2(x: number, y: number): SpatialGridCell {
    const key = packKey2(x, y);
    let cell = this.map.get(key);
    if (!cell) {
      cell = new SpatialGridCell(key, [x, y]);
      this.map.set(key, cell);
    }
    return cell;
  }

  public getCell3(x: number, y: number, z: number): SpatialGridCell {
    const key = packKey3(x, y, z);
    let cell = this.map.get(key);
    if (!cell) {
      cell = new SpatialGridCell(key, [x, y, z]);
      this.map.set(key, cell);
    }
    return cell;
  }

  public getCellIfExists(cellCoords: NumericVector): SpatialGridCellInterface | undefined {
    if (cellCoords.length === 2) {
      return this.map.get(packKey2(cellCoords[0], cellCoords[1]));
    }
    if (cellCoords.length === 3) {
      return this.map.get(packKey3(cellCoords[0], cellCoords[1], cellCoords[2]));
    }
    return undefined;
  }

  public getCellIfExists2(x: number, y: number): SpatialGridCell | undefined {
    return this.map.get(packKey2(x, y));
  }

  public getCellIfExists3(x: number, y: number, z: number): SpatialGridCell | undefined {
    return this.map.get(packKey3(x, y, z));
  }

  public findAtomByCoords(coords: NumericVector, radiusMap: number[], radiusMultiplier: number): AtomInterface | undefined {
    const cellCoords = this.getCellCoords(coords);
    let best: AtomInterface | undefined;
    let bestDist = Infinity;

    const dims = cellCoords.length;
    const min = cellCoords.map((c) => c - 1);
    const max = cellCoords.map((c) => c + 1);

    const visit = (cell: SpatialGridCellInterface | undefined) => {
      if (!cell) {
        return;
      }
      for (const atom of cell) {
        let dist2 = 0;
        for (let i = 0; i < coords.length; ++i) {
          const d = atom.position[i] - coords[i];
          dist2 += d * d;
        }
        const dist = Math.sqrt(dist2);
        const limit = radiusMap[atom.type] * radiusMultiplier;
        if (dist <= limit && dist < bestDist) {
          bestDist = dist;
          best = atom;
        }
      }
    };

    if (dims === 2) {
      for (let i = min[0]; i <= max[0]; ++i) {
        for (let j = min[1]; j <= max[1]; ++j) {
          visit(this.getCellIfExists2(i, j));
        }
      }
    } else if (dims === 3) {
      for (let i = min[0]; i <= max[0]; ++i) {
        for (let j = min[1]; j <= max[1]; ++j) {
          for (let k = min[2]; k <= max[2]; ++k) {
            visit(this.getCellIfExists3(i, j, k));
          }
        }
      }
    } else {
      for (const neighbourCoords of getNeighboursCoords(cellCoords)) {
        visit(this.getCellIfExists(neighbourCoords));
      }
    }

    return best;
  }

  private getCellByAtom(atom: AtomInterface): SpatialGridCellInterface {
    const pos = atom.position;
    if (pos.length === 2) {
      return this.getCell2(
        Math.round(pos[0] / this.quantum) + this.phase,
        Math.round(pos[1] / this.quantum) + this.phase,
      );
    }
    if (pos.length === 3) {
      return this.getCell3(
        Math.round(pos[0] / this.quantum) + this.phase,
        Math.round(pos[1] / this.quantum) + this.phase,
        Math.round(pos[2] / this.quantum) + this.phase,
      );
    }
    const cellCoords = this.getCellCoords(pos);
    return this.getCell(cellCoords);
  }

  private getCellCoords(coords: NumericVector): NumericVector {
    const buf = this.coordBuf;
    buf.length = coords.length;
    for (let i = 0; i < coords.length; ++i) {
      buf[i] = Math.round(coords[i] / this.quantum) + this.phase;
    }
    return buf;
  }
}

export class SpatialGridManager implements SpatialGridManagerManagerInterface {
  private readonly map: SpatialGrid;

  constructor(quantum: number) {
    this.map = new SpatialGrid(quantum, 0);
  }

  countAtoms(): number {
    return this.map.countAtoms();
  }

  clear(): void {
    this.map.clear();
  }

  detachAtom(atom: AtomInterface): void {
    this.map.detachAtom(atom);
  }

  updateAtomCell(atom: AtomInterface): void {
    this.map.handleAtom(atom);
  }

  handleAtom(atom: AtomInterface, callback: (lhs: AtomInterface, rhs: AtomInterface) => void): void {
    const cc = atom.spatialGridCell ?? this.map.handleAtom(atom);
    const atomId = atom.id;

    if (atom.position.length === 2) {
      const x0 = cc.coords[0];
      const y0 = cc.coords[1];
      for (let i = x0 - 1; i <= x0 + 1; ++i) {
        for (let j = y0 - 1; j <= y0 + 1; ++j) {
          const cell = this.map.getCellIfExists2(i, j);
          if (!cell) {
            continue;
          }
          for (const neighbour of cell.atoms) {
            if (neighbour.id > atomId) {
              callback(atom, neighbour);
            }
          }
        }
      }
      return;
    }

    if (atom.position.length === 3) {
      const x0 = cc.coords[0];
      const y0 = cc.coords[1];
      const z0 = cc.coords[2];
      for (let i = x0 - 1; i <= x0 + 1; ++i) {
        for (let j = y0 - 1; j <= y0 + 1; ++j) {
          for (let k = z0 - 1; k <= z0 + 1; ++k) {
            const cell = this.map.getCellIfExists3(i, j, k);
            if (!cell) {
              continue;
            }
            for (const neighbour of cell.atoms) {
              if (neighbour.id > atomId) {
                callback(atom, neighbour);
              }
            }
          }
        }
      }
      return;
    }

    for (const coords of getNeighboursCoords(cc.coords)) {
      const cell = this.map.getCellIfExists(coords);
      if (!cell) {
        continue;
      }
      for (const neighbour of cell.atoms) {
        if (neighbour.id > atomId) {
          callback(atom, neighbour);
        }
      }
    }
  }

  findAtomByCoords(coords: NumericVector, radiusMap: number[], radiusMultiplier: number): AtomInterface | undefined {
    return this.map.findAtomByCoords(coords, radiusMap, radiusMultiplier);
  }
}
