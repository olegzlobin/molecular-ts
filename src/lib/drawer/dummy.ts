import type { DrawerInterface, EventManagerInterface, ReactionEffectKind } from './types';
import type { ColorVector } from '../config/types';
import type { NumericVector } from '../math/types';

export class DrawerDummy implements DrawerInterface {
  public draw(): void {
    return;
  }

  public clear(): void {
    return;
  }

  public pushReactionEffect(
    _position: NumericVector,
    _color: ColorVector,
    _kind: ReactionEffectKind,
  ): void {
    return;
  }

  public pushLinkBreakEffect(
    _from: NumericVector,
    _to: NumericVector,
    _color: ColorVector,
  ): void {
    return;
  }

  public get eventManager(): EventManagerInterface | undefined {
    return undefined;
  }
}

export function createDummyDrawer() {
  return new DrawerDummy();
}
