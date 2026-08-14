import type { AtomInterface } from '../simulation/types/atomic';
import type { NumericVector } from '../math/types';
import type {
  ViewModeConfig,
  WorldConfig,
  TypesConfig,
  ViewMode,
  ColorVector,
} from '../config/types';
import type { PhysicModelInterface } from '../simulation/types/interaction';
import { Atom } from '../simulation/atomic';
import { PhysicModelSpring } from '../physics/spring';
import { createVector } from "@/lib/math";

export const fullCopyObject = <T extends Record<string, any>>(obj: T) => JSON.parse(JSON.stringify(obj)) as T;

let LAST_ATOM_ID = 0;

function nextId(id?: number): number {
  if (id !== undefined) {
    LAST_ATOM_ID = Math.max(id, LAST_ATOM_ID);
    return id;
  }

  return LAST_ATOM_ID++;
}

export function createAtom(type: number, position: NumericVector, speed?: NumericVector, id?: number): AtomInterface {
  return new Atom(nextId(id), type, position, speed);
}

function getRandomColorNumber(): number {
  return Math.round(Math.random()*255);
}

export function getRandomColor(): [number, number, number] {
  let r = getRandomColorNumber();
  let g = getRandomColorNumber();
  let b = getRandomColorNumber();
  const sum = r + g + b;
  if (sum < 256*3 / 2) {
    const delta = Math.round((256*3 / 2 - sum) / (Math.random() + 1));
    [r, g, b] = [r+delta, g+delta, b+delta];
  }
  return [r, g, b];
}

export function getDifferentRandomColor(previousColors: ColorVector[], minDistance: number = 200, maxTries: number = 16): [number, number, number] {
  let triesCount = 0;
  while (true) {
    const candidate = getRandomColor();
    let isCandidateValid = true;
    for (const prevColor of previousColors) {
      if (createVector(prevColor).sub(candidate).abs < minDistance) {
        isCandidateValid = false;
        console.warn(`inappropriate color | prevColors: ${previousColors.length} | minDistance: ${minDistance} | try: ${triesCount}`);
        break;
      }
    }
    if (isCandidateValid) {
      return candidate;
    }
    if (++triesCount === maxTries) {
      triesCount = 0;
      minDistance = Math.round(minDistance/2);
    }
  }
}

export function createPhysicModel(
  worldConfig: WorldConfig,
  typesConfig: TypesConfig,
): PhysicModelInterface {
  return new PhysicModelSpring(worldConfig, typesConfig);
}

export function getViewModeConfig(worldConfig: WorldConfig, viewMode?: ViewMode): ViewModeConfig {
  return (viewMode ?? worldConfig.VIEW_MODE) === '3d'
    ? worldConfig.CONFIG_3D
    : worldConfig.CONFIG_2D;
}
