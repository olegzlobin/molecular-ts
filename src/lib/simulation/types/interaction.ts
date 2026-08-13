import type { AtomInterface, LinkInterface } from './atomic';
import type { TypesConfig, WorldConfig } from '../../config/types';
import type { GeometryHelperInterface } from './utils';

export interface InteractionManagerInterface {
  handleTime(): void;
  moveAtom(atom: AtomInterface): void;
  interactLink(link: LinkInterface): void;
  interactAtoms(atom: AtomInterface, neighbour: AtomInterface): void;
  setPhysicModel(model: PhysicModelInterface): void;
  updateAtomType(atom: AtomInterface): void;
}

export interface PhysicModelInterface {
  readonly geometry: GeometryHelperInterface;
  getGravityForce(lhs: AtomInterface, rhs: AtomInterface, dist2: number): number;
  getGravityForces(lhs: AtomInterface, rhs: AtomInterface, dist2: number): [number, number];
  getLinkForce(lhs: AtomInterface, rhs: AtomInterface, dist2: number, elasticFactor: number): number;
  getBoundsForce(dist: number): number;
}

export type PhysicModelConstructor ={ new (worldConfig: WorldConfig, typesConfig: TypesConfig): PhysicModelInterface };
