import type { RandomTypesConfig, TypesConfig, TypesSymmetricConfig, WorldConfig } from '@/lib/config/types';
import { fullCopyObject } from '@/lib/utils/functions';
import { ensureNumericTypesFields } from '@/lib/config/types-config-fields';
import { ensureTypeNames } from '@/lib/config/atom-types';
import { syncDerivedTypeLinks } from '@/lib/config/bond-limits';

export function convertWorldConfigForBackwardCompatibility(inputConfig: WorldConfig): WorldConfig {
  const config = fullCopyObject(inputConfig);
  if (config.DECAY_SPLITS_VELOCITY === undefined) {
    config.DECAY_SPLITS_VELOCITY = 1;
  }
  if (config.WORLD_GRAVITY === undefined) {
    config.WORLD_GRAVITY = 0;
  }
  if (config.COULOMB_FORCE_MULTIPLIER === undefined) {
    config.COULOMB_FORCE_MULTIPLIER = 0.6;
  }
  config.PHYSIC_MODEL = 'spring';
  return config;
}

export function convertTypesConfigForBackwardCompatibility(inputConfig: TypesConfig): TypesConfig {
  const config = fullCopyObject(inputConfig);
  const raw = config as Record<string, unknown>;

  deleteKey(config, 'LINK_FACTOR_DISTANCE');
  deleteKey(config, 'LINK_FACTOR_ELASTIC');
  deleteKey(config, 'LINK_FACTOR_DISTANCE_EXTENDED');
  deleteKey(config, 'LINK_FACTOR_DISTANCE_USE_EXTENDED');

  const mistypedTransforms = raw.TRANSFORMS;
  if (mistypedTransforms !== undefined && config.TRANSFORMS === undefined) {
    config.TRANSFORMS = mistypedTransforms as TypesConfig['TRANSFORMS'];
  }
  deleteKey(raw, 'TRANSFORMS');

  // LINK_GRAVITY was 1/r²; LINK_BIAS is constant ≈ old / r² at typical bond length (~10)
  if (raw.LINK_GRAVITY !== undefined && raw.LINK_BIAS === undefined) {
    raw.LINK_BIAS = scaleLegacyLinkGravityMatrix(raw.LINK_GRAVITY);
  }
  deleteKey(raw, 'LINK_GRAVITY');

  if (config.DECAYS === undefined) {
    config.DECAYS = {};
  } else {
    for (const key in config.DECAYS) {
      const rule = config.DECAYS[Number(key)];
      if (rule.stabilizers === undefined) {
        rule.stabilizers = [];
      }
    }
  }

  if (config.TRANSFORMS === undefined) {
    config.TRANSFORMS = {};
  }

  ensureNumericTypesFields(config);
  config.NAMES = ensureTypeNames(config.NAMES, config.COLORS?.length ?? config.RADIUS?.length ?? 0);
  syncDerivedTypeLinks(config);

  return config;
}

export function convertRandomTypesConfigForBackwardCompatibility(inputConfig: RandomTypesConfig): RandomTypesConfig {
  const config = fullCopyObject(inputConfig);
  const raw = config as Record<string, unknown>;
  renameKey(raw, 'USE_LINK_GRAVITY_BOUNDS', 'USE_LINK_BIAS_BOUNDS');
  renameKey(raw, 'LINK_GRAVITY_MATRIX_SYMMETRIC', 'LINK_BIAS_MATRIX_SYMMETRIC');
  if (raw.LINK_GRAVITY_BOUNDS !== undefined && raw.LINK_BIAS_BOUNDS === undefined) {
    raw.LINK_BIAS_BOUNDS = scaleLegacyLinkGravityBounds(raw.LINK_GRAVITY_BOUNDS);
  }
  deleteKey(raw, 'LINK_GRAVITY_BOUNDS');

  if (config.USE_LINK_LENGTH_BOUNDS === undefined) {
    config.USE_LINK_LENGTH_BOUNDS = false;
  }
  if (config.USE_LINK_STIFFNESS_BOUNDS === undefined) {
    config.USE_LINK_STIFFNESS_BOUNDS = false;
  }
  if (config.USE_CHARGE_BOUNDS === undefined) {
    config.USE_CHARGE_BOUNDS = false;
  }
  if (config.USE_BOND_PREFERENCE_BOUNDS === undefined) {
    config.USE_BOND_PREFERENCE_BOUNDS = false;
  }
  if (config.USE_BOND_PREFERENCE_FACTOR_BOUNDS === undefined) {
    config.USE_BOND_PREFERENCE_FACTOR_BOUNDS = false;
  }
  if (config.USE_LINK_STRENGTH_FACTOR_BOUNDS === undefined) {
    config.USE_LINK_STRENGTH_FACTOR_BOUNDS = false;
  }
  if (!config.LINK_LENGTH_BOUNDS) {
    config.LINK_LENGTH_BOUNDS = [0.7, 1.3, 1, 0.1];
  }
  if (!config.LINK_STIFFNESS_BOUNDS) {
    config.LINK_STIFFNESS_BOUNDS = [0.5, 1.2, 1, 0.1];
  }
  if (!config.CHARGE_BOUNDS) {
    config.CHARGE_BOUNDS = [-2, 2, 0, 0.5];
  }
  if (!config.BOND_PREFERENCE_BOUNDS) {
    config.BOND_PREFERENCE_BOUNDS = [0, 4, 1.5, 0.1];
  }
  if (!config.BOND_PREFERENCE_FACTOR_BOUNDS) {
    config.BOND_PREFERENCE_FACTOR_BOUNDS = [0.5, 2, 1, 0.1];
  }
  if (!config.LINK_STRENGTH_FACTOR_BOUNDS) {
    config.LINK_STRENGTH_FACTOR_BOUNDS = [0.3, 1.5, 1, 0.1];
  }
  if (config.BOND_PREFERENCE_MATRIX_SYMMETRIC === undefined) {
    config.BOND_PREFERENCE_MATRIX_SYMMETRIC = true;
  }
  if (config.BOND_PREFERENCE_FACTOR_MATRIX_SYMMETRIC === undefined) {
    config.BOND_PREFERENCE_FACTOR_MATRIX_SYMMETRIC = true;
  }
  if (config.BOND_PREFERENCE_FACTOR_IGNORE_SELF_TYPE === undefined) {
    config.BOND_PREFERENCE_FACTOR_IGNORE_SELF_TYPE = true;
  }
  if (config.LINK_STRENGTH_FACTOR_MATRIX_SYMMETRIC === undefined) {
    config.LINK_STRENGTH_FACTOR_MATRIX_SYMMETRIC = true;
  }
  if (config.LINK_STRENGTH_FACTOR_IGNORE_SELF_TYPE === undefined) {
    config.LINK_STRENGTH_FACTOR_IGNORE_SELF_TYPE = true;
  }
  deleteKey(raw, 'BOND_PREFERENCE_FACTOR_DEVIATION_SHARE');
  return config;
}

export function convertTypesSymmetricConfigForBackwardCompatibility(inputConfig: TypesSymmetricConfig): TypesSymmetricConfig {
  const config = fullCopyObject(inputConfig);
  const raw = config as Record<string, unknown>;
  renameKey(raw, 'LINK_GRAVITY_MATRIX_SYMMETRIC', 'LINK_BIAS_MATRIX_SYMMETRIC');
  if (config.BOND_PREFERENCE_MATRIX_SYMMETRIC === undefined) {
    config.BOND_PREFERENCE_MATRIX_SYMMETRIC = true;
  }
  if (config.BOND_PREFERENCE_FACTOR_MATRIX_SYMMETRIC === undefined) {
    config.BOND_PREFERENCE_FACTOR_MATRIX_SYMMETRIC = true;
  }
  if (config.LINK_STRENGTH_FACTOR_MATRIX_SYMMETRIC === undefined) {
    config.LINK_STRENGTH_FACTOR_MATRIX_SYMMETRIC = true;
  }
  deleteKey(config, 'LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC');
  deleteKey(config, 'LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC');
  return config;
}

const LEGACY_LINK_GRAVITY_SCALE = 0.01;

function scaleLegacyLinkGravityMatrix(value: unknown): number[][] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((row) => (
    Array.isArray(row)
      ? row.map((cell) => Number(cell) * LEGACY_LINK_GRAVITY_SCALE)
      : []
  ));
}

function scaleLegacyLinkGravityBounds(value: unknown): [number, number, number?, number?, number?] {
  if (!Array.isArray(value) || value.length < 2) {
    return [-0.5, 0.2, -0.1, 0.05, 1];
  }
  const scaled = value.map((x, i) => (
    i < 4 && typeof x === 'number' ? Number((x * LEGACY_LINK_GRAVITY_SCALE).toFixed(6)) : x
  ));
  return scaled as [number, number, number?, number?, number?];
}

function renameKey(input: Record<string, unknown>, from: string, to: string): void {
  if (input[from] !== undefined && input[to] === undefined) {
    input[to] = input[from];
  }
  deleteKey(input, from);
}

function deleteKey<T extends Record<string, unknown>>(input: T, key: string): T {
  if (input[key] !== undefined) {
    delete input[key];
  }
  return input;
}
