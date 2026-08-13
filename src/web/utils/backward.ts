import type { RandomTypesConfig, TypesConfig, TypesSymmetricConfig, WorldConfig } from '@/lib/config/types';
import { fullCopyObject } from '@/lib/utils/functions';
import { ensureNumericTypesFields } from '@/lib/config/types-config-fields';

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
  return config;
}

export function convertTypesConfigForBackwardCompatibility(inputConfig: TypesConfig): TypesConfig {
  const config = fullCopyObject(inputConfig);

  deleteKey(config, 'LINK_FACTOR_DISTANCE');
  deleteKey(config, 'LINK_FACTOR_ELASTIC');
  deleteKey(config, 'LINK_FACTOR_DISTANCE_EXTENDED');
  deleteKey(config, 'LINK_FACTOR_DISTANCE_USE_EXTENDED');

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

  if (config.TRANSFORMATION === undefined) {
    config.TRANSFORMATION = {};
  }

  ensureNumericTypesFields(config);

  return config;
}

export function convertRandomTypesConfigForBackwardCompatibility(inputConfig: RandomTypesConfig): RandomTypesConfig {
  const config = fullCopyObject(inputConfig);
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
  if (config.BOND_PREFERENCE_MATRIX_SYMMETRIC === undefined) {
    config.BOND_PREFERENCE_MATRIX_SYMMETRIC = true;
  }
  deleteKey(config, 'USE_LINK_FACTOR_DISTANCE_BOUNDS');
  deleteKey(config, 'USE_LINK_FACTOR_ELASTIC_BOUNDS');
  deleteKey(config, 'LINK_FACTOR_DISTANCE_BOUNDS');
  deleteKey(config, 'LINK_FACTOR_ELASTIC_BOUNDS');
  deleteKey(config, 'LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC');
  deleteKey(config, 'LINK_FACTOR_DISTANCE_IGNORE_SELF_TYPE');
  deleteKey(config, 'LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC');
  deleteKey(config, 'LINK_FACTOR_ELASTIC_IGNORE_SELF_TYPE');
  return config;
}

export function convertTypesSymmetricConfigForBackwardCompatibility(inputConfig: TypesSymmetricConfig): TypesSymmetricConfig {
  const config = fullCopyObject(inputConfig);
  if (config.BOND_PREFERENCE_MATRIX_SYMMETRIC === undefined) {
    config.BOND_PREFERENCE_MATRIX_SYMMETRIC = true;
  }
  deleteKey(config, 'LINK_FACTOR_DISTANCE_MATRIX_SYMMETRIC');
  deleteKey(config, 'LINK_FACTOR_ELASTIC_MATRIX_SYMMETRIC');
  return config;
}

function deleteKey<T extends Record<string, unknown>>(input: T, key: string): T {
  if (input[key] !== undefined) {
    delete input[key];
  }
  return input;
}
