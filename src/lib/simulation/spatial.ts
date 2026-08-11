import type { AtomInterface } from './types/atomic';
import type { NumericVector } from '../math/types';
import type { SpatialGridCellInterface, SpatialGridManagerManagerInterface, SpatialGridInterface } from './types/spatial';

function cellKey(cellCoords: NumericVector): string {
  return cellCoords.join(',');
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
  for (let i=0; i<curPoint.length; ++i) {
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

  constructor(coords: NumericVector) {
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
  map: Map<string, SpatialGridCell> = new Map();
  quantum: number;
  phase: number;

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
      this.map.delete(cellKey(cell.coords));
    }
  }

  public getCell(cellCoords: NumericVector): SpatialGridCellInterface {
    const key = cellKey(cellCoords);

    if (!this.map.has(key)) {
      this.map.set(key, new SpatialGridCell([...cellCoords]));
    }

    return this.map.get(key) as SpatialGridCell;
  }

  public getCellIfExists(cellCoords: NumericVector): SpatialGridCellInterface | undefined {
    return this.map.get(cellKey(cellCoords));
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
          visit(this.getCellIfExists([i, j]));
        }
      }
    } else if (dims === 3) {
      for (let i = min[0]; i <= max[0]; ++i) {
        for (let j = min[1]; j <= max[1]; ++j) {
          for (let k = min[2]; k <= max[2]; ++k) {
            visit(this.getCellIfExists([i, j, k]));
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
    const cellCoords = this.getCellCoords(atom.position);
    return this.getCell(cellCoords);
  }

  private getCellCoords(coords: NumericVector): NumericVector {
    const result: NumericVector = new Array<number>(coords.length);
    for (let i=0; i<coords.length; ++i) {
      result[i] = Math.round(coords[i] / this.quantum) + this.phase;
    }
    return result;
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
    const onNeighbour = (neighbour: AtomInterface) => {
      if (neighbour.id <= atom.id) {
        return;
      }
      callback(atom, neighbour);
    };

    const cc = atom.spatialGridCell ?? this.map.handleAtom(atom);
    if (atom.position.length === 3) {
      for (let i=cc.coords[0]-1; i<=cc.coords[0]+1; ++i) {
        for (let j=cc.coords[1]-1; j<=cc.coords[1]+1; ++j) {
          for (let k=cc.coords[2]-1; k<=cc.coords[2]+1; ++k) {
            const cell = this.map.getCellIfExists([i, j, k]);
            if (!cell) {
              continue;
            }
            for (const neighbour of cell.atoms) {
              onNeighbour(neighbour);
            }
          }
        }
      }
    } else if (atom.position.length === 2) {
      for (let i=cc.coords[0]-1; i<=cc.coords[0]+1; ++i) {
        for (let j=cc.coords[1]-1; j<=cc.coords[1]+1; ++j) {
          const cell = this.map.getCellIfExists([i, j]);
          if (!cell) {
            continue;
          }
          for (const neighbour of cell.atoms) {
            onNeighbour(neighbour);
          }
        }
      }
    } else {
      for (const coords of getNeighboursCoords(cc.coords)) {
        const cell = this.map.getCellIfExists(coords);
        if (!cell) {
          continue;
        }
        for (const neighbour of cell.atoms) {
          onNeighbour(neighbour);
        }
      }
    }
  }

  findAtomByCoords(coords: NumericVector, radiusMap: number[], radiusMultiplier: number): AtomInterface | undefined {
    return this.map.findAtomByCoords(coords, radiusMap, radiusMultiplier);
  }
}
