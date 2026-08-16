import type { TypesConfig } from '../config/types';

/** Inertial mass for a type. Falls back to RADIUS³ for legacy configs. */
export function typeMass(typesConfig: TypesConfig, type: number): number {
  const listed = typesConfig.MASS?.[type];
  const mass = listed !== undefined
    ? listed
    : (typesConfig.RADIUS[type] ?? 1) ** 3;
  return mass > 0 ? mass : 1e-6;
}
