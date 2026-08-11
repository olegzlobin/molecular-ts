import type { NumericVector } from '../math/types';

export type ColorVector = [number, number, number];
export type PhysicModelName = 'v1' | 'v2';
export type ViewMode = '2d' | '3d';

export type RadiusConfig = number[];
export type GravityConfig = number[][];
export type LinksConfig = number[];
export type TypeLinksConfig = number[][];
export type TypeLinkWeightsConfig = number[][];
export type LinkFactorDistanceConfig = number[][][];
export type LinkFactorElasticConfig = number[][][];
export type FrequenciesConfig = number[];
export type ColorsConfig = Array<ColorVector>;
// value >= 0: change type; value < 0: merge into type (-value - 1)
export type TransformationConfig = Record<number, Record<number, number>>;

export function isMergeTransform(value: number): boolean {
  return value < 0;
}

export function decodeTransformType(value: number): number {
  return value < 0 ? -value - 1 : value;
}

export function encodeTransform(type: number, merge: boolean): number {
  return merge ? -(type + 1) : type;
}

export type DecayRule = {
  halfLife: number;
  to: number;
  secondary: number | null;
  stabilizers: number[];
};
export type DecayConfig = Record<number, DecayRule>;

export type BoundsConfig = {
  MIN_POSITION: NumericVector;
  MAX_POSITION: NumericVector;
};
export type InitialConfig = {
  ATOMS_COUNT: number;
  MIN_POSITION: NumericVector;
  MAX_POSITION: NumericVector;
};
export type ViewModeConfig = {
  BOUNDS: BoundsConfig;
  INITIAL: InitialConfig;
};
export type TypesConfig = {
  RADIUS: RadiusConfig;
  GRAVITY: GravityConfig;
  LINK_GRAVITY: GravityConfig;
  LINKS: LinksConfig;
  TYPE_LINKS: TypeLinksConfig;
  TYPE_LINK_WEIGHTS: TypeLinkWeightsConfig;
  LINK_LENGTH: number[];
  LINK_STIFFNESS: number[];
  LINK_FACTOR_DISTANCE: LinkFactorDistanceConfig;
  LINK_FACTOR_ELASTIC: LinkFactorElasticConfig;
  FREQUENCIES: FrequenciesConfig;
  COLORS: ColorsConfig;
  TRANSFORMATION: TransformationConfig;
  DECAYS: DecayConfig;
};
export type WorldConfig = {
  VIEW_MODE: ViewMode;
  PHYSIC_MODEL: PhysicModelName;
  ATOM_RADIUS: number;
  MAX_INTERACTION_RADIUS: number;
  MAX_LINK_RADIUS: number;
  MAX_FORCE: number,
  GRAVITY_FORCE_MULTIPLIER: number;
  WORLD_GRAVITY: number;
  LINK_FORCE_MULTIPLIER: number;
  BOUNCE_FORCE_MULTIPLIER: number;
  BOUNDS_FORCE_MULTIPLIER: number;
  INERTIAL_MULTIPLIER: number;
  PLAYBACK_SPEED: number;
  SIMPLIFIED_VIEW_MODE: boolean;
  SPEED: number;
  TEMPERATURE_MULTIPLIER: number;
  DECAY_SPLITS_VELOCITY: number;
  TEMPERATURE_FUNCTION: (p: NumericVector, t: number) => number;
  CONFIG_2D: ViewModeConfig;
  CONFIG_3D: ViewModeConfig;
};
export type RandomTypesConfig = {
  TYPES_COUNT: number;

  USE_RADIUS_BOUNDS: boolean;
  USE_FREQUENCY_BOUNDS: boolean;
  USE_GRAVITY_BOUNDS: boolean;
  USE_LINK_GRAVITY_BOUNDS: boolean;
  USE_LINK_BOUNDS: boolean;
  USE_LINK_TYPE_BOUNDS: boolean;
  USE_LINK_TYPE_WEIGHT_BOUNDS: boolean;
  USE_LINK_LENGTH_BOUNDS: boolean;
  USE_LINK_STIFFNESS_BOUNDS: boolean;
  USE_LINK_FACTOR_DISTANCE_BOUNDS: boolean;
  USE_LINK_FACTOR_ELASTIC_BOUNDS: boolean;

  RADIUS_BOUNDS: [number, number, number?, number?];
  FREQUENCY_BOUNDS: [number, number, number?, number?];
  GRAVITY_BOUNDS: [number, number, number?, number?];
  LINK_GRAVITY_BOUNDS: [number, number, number?, number?];
  LINK_BOUNDS: [number, number, number?];
  LINK_TYPE_BOUNDS: [number, number, number?];
  LINK_TYPE_WEIGHT_BOUNDS: [number, number, number?, number?];
  LINK_LENGTH_BOUNDS: [number, number, number?, number?];
  LINK_STIFFNESS_BOUNDS: [number, number, number?, number?];
  LINK_FACTOR_DISTANCE_BOUNDS: [number, number, number?, number?];
  LINK_FACTOR_ELASTIC_BOUNDS: [number, number, number?, number?];

  GRAVITY_MATRIX_SYMMETRIC: boolean;
  LINK_GRAVITY_MATRIX_SYMMETRIC: boolean;
  LINK_TYPE_MATRIX_SYMMETRIC: boolean;
  LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC: boolean;
  LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC: boolean;
  LINK_FACTOR_DISTANCE_IGNORE_SELF_TYPE: boolean;
  LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC: boolean;
  LINK_FACTOR_ELASTIC_IGNORE_SELF_TYPE: boolean;
};

export type TypesSymmetricConfig = {
  GRAVITY_MATRIX_SYMMETRIC: boolean;
  LINK_GRAVITY_MATRIX_SYMMETRIC: boolean;
  LINK_TYPE_MATRIX_SYMMETRIC: boolean;
  LINK_TYPE_WEIGHT_MATRIX_SYMMETRIC: boolean;
  LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC: boolean;
  LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC: boolean;
}
