import { createVector } from '../math';
import type { NumericVector } from '../math/types';
import type {
  Drawer2dConfigInterface,
  DrawerInterface,
  EventManagerInterface,
  ShowConfig,
  ViewConfig,
} from './types';
import type { ColorVector, TypesConfig, WorldConfig } from '../config/types';
import type { AtomInterface, LinkInterface } from '../simulation/types/atomic';
import type { LinkManagerInterface } from '../simulation/types/utils';
import { EventManager } from '../drawer/utils';

/**
 * Transpose coords with backward applying offset and scale
 * @param coords - coords to transpose
 * @param offset - offset vector
 * @param scale - scale vector
 */
export function transposeCoordsBackward(
  coords: NumericVector, offset: NumericVector, scale: NumericVector = [1, 1],
): NumericVector {
  const [x, y] = coords;
  return [(x - offset[0]) / scale[0], (y - offset[1]) / scale[1]];
}

/**
 * Transpose coords with forward applying offset and scale
 * @param coords - coords to transpose
 * @param offset - offset vector
 * @param scale - scale vector
 */
export function transposeCoordsForward(
  coords: NumericVector, offset: NumericVector, scale: NumericVector = [1, 1],
): NumericVector {
  const [x, y] = coords;
  return [x * scale[0] + offset[0], y * scale[1] + offset[1]];
}

export class Drawer2d implements DrawerInterface {
  public readonly eventManager: EventManagerInterface;
  private readonly WORLD_CONFIG: WorldConfig;
  private readonly TYPES_CONFIG: TypesConfig;
  private readonly domElement: HTMLCanvasElement;
  private readonly viewConfig: ViewConfig;
  private readonly showConfig: ShowConfig;
  private readonly context: CanvasRenderingContext2D;

  constructor({
    domElement,
    viewConfig,
    showConfig,
    worldConfig,
    typesConfig,
  }: Drawer2dConfigInterface) {
    this.domElement = domElement;
    this.viewConfig = viewConfig;
    this.showConfig = showConfig;
    this.WORLD_CONFIG = worldConfig;
    this.TYPES_CONFIG = typesConfig;
    this.context = domElement.getContext('2d') as CanvasRenderingContext2D;
    this.eventManager = new EventManager();
    this.refresh();
    this.initEventHandlers();
  }

  public draw(atoms: Array<AtomInterface>, links: LinkManagerInterface): void {
    this.clear();
    this.context.save();
    this.context.translate(this.viewConfig.offset[0], this.viewConfig.offset[1]);
    this.context.scale(this.viewConfig.scale[0], this.viewConfig.scale[1]);

    const canvasWidth = this.domElement.width;
    const canvasHeight = this.domElement.height;

    if (this.showConfig.showLinks) {
      for (const link of links) {
        // Применяем трансформации к позициям обоих атомов связи
        const lhsX = link.lhs.position[0] * this.viewConfig.scale[0] + this.viewConfig.offset[0];
        const lhsY = link.lhs.position[1] * this.viewConfig.scale[1] + this.viewConfig.offset[1];
        const rhsX = link.rhs.position[0] * this.viewConfig.scale[0] + this.viewConfig.offset[0];
        const rhsY = link.rhs.position[1] * this.viewConfig.scale[1] + this.viewConfig.offset[1];

        // Получаем максимальную ширину связи
        const linkWidth = this.getLinkWidth(link) * this.viewConfig.scale[0];

        // Проверяем, попадает ли линия в видимую область
        // Используем AABB (axis-aligned bounding box) линии с учетом ширины и кратности
        const bondOrder = this.getBondOrder(link);
        const bondSpread = this.getBondSpread(bondOrder);
        const minX = Math.min(lhsX, rhsX) - linkWidth - bondSpread * this.viewConfig.scale[0];
        const maxX = Math.max(lhsX, rhsX) + linkWidth + bondSpread * this.viewConfig.scale[0];
        const minY = Math.min(lhsY, rhsY) - linkWidth - bondSpread * this.viewConfig.scale[1];
        const maxY = Math.max(lhsY, rhsY) + linkWidth + bondSpread * this.viewConfig.scale[1];

        // Проверяем пересечение с видимой областью
        if (maxX >= 0 && minX <= canvasWidth && maxY >= 0 && minY <= canvasHeight) {
          this.drawBond(link);
        }
      }
    }

    if (this.showConfig.showAtoms) {
      for (let i=0; i<atoms.length; ++i) {
        const atom = atoms[i];

        // Применяем текущие трансформации к позиции атома
        const transformedX = atom.position[0] * this.viewConfig.scale[0] + this.viewConfig.offset[0];
        const transformedY = atom.position[1] * this.viewConfig.scale[1] + this.viewConfig.offset[1];

        // Получаем радиус атома в пикселях после трансформации
        const atomRadius = this.TYPES_CONFIG.RADIUS[atom.type] * this.WORLD_CONFIG.ATOM_RADIUS * this.viewConfig.scale[0];

        // Проверяем, попадает ли атом в видимую область (с небольшим запасом)
        if (
          transformedX + atomRadius >= 0 &&
          transformedX - atomRadius <= canvasWidth &&
          transformedY + atomRadius >= 0 &&
          transformedY - atomRadius <= canvasHeight
        ) {
          // Рисуем только отфильтрованные связи
          this.drawCircle(
            atom.position,
            this.TYPES_CONFIG.RADIUS[atom.type] * this.WORLD_CONFIG.ATOM_RADIUS,
            this.TYPES_CONFIG.COLORS[atom.type],
          );
        }
      }
    }

    if (this.showConfig.showBounds) {
      this.drawBounds();
    }

    this.context.restore();
  }

  public clear(): void {
    this.context.fillStyle = 'rgb(51, 51, 76, 0.8)';
    this.context.rect(0, 0, this.width, this.height);
    this.context.fill();
  }

  private drawBounds(): void {
    const bounds = this.WORLD_CONFIG.CONFIG_2D.BOUNDS;
    const minX = bounds.MIN_POSITION[0];
    const minY = bounds.MIN_POSITION[1];
    const width = bounds.MAX_POSITION[0] - minX;
    const height = bounds.MAX_POSITION[1] - minY;
    const scale = Math.max(this.viewConfig.scale[0], this.viewConfig.scale[1], 1e-6);

    this.context.beginPath();
    this.context.strokeStyle = 'rgba(210, 215, 230, 0.2)';
    this.context.lineWidth = 1.25 / scale;
    this.context.strokeRect(minX, minY, width, height);
    this.context.closePath();
  }

  private drawCircle(position: NumericVector, radius: number, color: ColorVector) {
    this.context.beginPath();
    this.context.fillStyle = `rgb(${color.join(', ')})`;
    this.context.ellipse(position[0], position[1], radius, radius, 0, 0, 2 * Math.PI);
    this.context.fill();
    this.context.closePath();
  }

  private drawLine(from: NumericVector, to: NumericVector, width: number, color: string) {
    this.context.beginPath();
    this.context.strokeStyle = color;
    this.context.lineWidth = width;
    this.context.moveTo(...from as [number, number]);
    this.context.lineTo(...to as [number, number]);
    this.context.stroke();
    this.context.closePath();
  }

  private getBondOrder(link: LinkInterface): number {
    const weights = this.TYPES_CONFIG.TYPE_LINK_WEIGHTS;
    const forward = weights?.[link.lhs.type]?.[link.rhs.type] ?? 1;
    const backward = weights?.[link.rhs.type]?.[link.lhs.type] ?? 1;
    return Math.max(1, Math.min(3, Math.round(Math.max(forward, backward))));
  }

  private getBondSpread(order: number): number {
    if (order <= 1) {
      return 0;
    }
    return this.WORLD_CONFIG.ATOM_RADIUS * 0.55 * (order - 1);
  }

  private drawBond(link: LinkInterface): void {
    const from = link.lhs.position;
    const to = link.rhs.position;
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy);
    if (!(len > 0)) {
      return;
    }

    const order = this.getBondOrder(link);
    const color = `rgb(${this.getLinkColor(link).join(', ')})`;
    const nx = -dy / len;
    const ny = dx / len;

    // Multiple strokes need thin lines + gap > stroke width, otherwise they fuse into one sausage.
    const width = order === 1
      ? this.getLinkWidth(link)
      : Math.min(4.8, Math.max(2.4, this.getLinkWidth(link) * 0.7));
    const spacing = order === 1
      ? 0
      : Math.max(width * 1.35, this.WORLD_CONFIG.ATOM_RADIUS * 0.55);

    for (let i = 0; i < order; ++i) {
      const offset = (i - (order - 1) / 2) * spacing;
      const ox = nx * offset;
      const oy = ny * offset;
      this.drawLine(
        [from[0] + ox, from[1] + oy],
        [to[0] + ox, to[1] + oy],
        width,
        color,
      );
    }
  }

  private getLinkColor(link: LinkInterface): ColorVector {
    const lhsColor = this.TYPES_CONFIG.COLORS[link.lhs.type];
    const rhsColor = this.TYPES_CONFIG.COLORS[link.rhs.type];
    return [
      Math.round((lhsColor[0]+rhsColor[0])/2),
      Math.round((lhsColor[1]+rhsColor[1])/2),
      Math.round((lhsColor[2]+rhsColor[2])/2),
    ];
  }

  private getLinkWidth(link: LinkInterface): number {
    const maxValue = this.WORLD_CONFIG.ATOM_RADIUS;
    const maxLength = this.WORLD_CONFIG.MAX_LINK_RADIUS;

    const dist = Math.sqrt(
      (link.rhs.position[0] - link.lhs.position[0])**2 +
      (link.rhs.position[1] - link.lhs.position[1])**2,
    );

    if (dist > maxLength) {
      return 1;
    }

    return (1-maxValue)/maxLength * dist + maxValue;
  }

  private refresh(): void {
    if (this.domElement.width !== this.width) {
      this.domElement.width = this.width;
    }

    if (this.domElement.height !== this.height) {
      this.domElement.height = this.height;
    }

    this.clear();
  }

  private clampView(): void {
    const bounds = this.WORLD_CONFIG.CONFIG_2D.BOUNDS;
    const [minX, minY] = bounds.MIN_POSITION;
    const [maxX, maxY] = bounds.MAX_POSITION;
    const worldW = Math.max(maxX - minX, 1);
    const worldH = Math.max(maxY - minY, 1);
    const canvasW = this.domElement.width || this.width || 1;
    const canvasH = this.domElement.height || this.height || 1;

    const fitScale = Math.min(canvasW / worldW, canvasH / worldH);
    const minScale = Math.max(fitScale, 1e-3);
    const maxScale = 40;
    const scale = Math.min(Math.max(this.viewConfig.scale[0], minScale), maxScale);
    this.viewConfig.scale = [scale, scale];

    const pad = Math.min(canvasW, canvasH) * 0.25;
    const clampAxis = (offset: number, min: number, max: number, canvas: number): number => {
      const lo = pad - max * scale;
      const hi = canvas - pad - min * scale;
      if (lo > hi) {
        return (lo + hi) / 2;
      }
      return Math.min(hi, Math.max(lo, offset));
    };

    this.viewConfig.offset[0] = clampAxis(this.viewConfig.offset[0], minX, maxX, canvasW);
    this.viewConfig.offset[1] = clampAxis(this.viewConfig.offset[1], minY, maxY, canvasH);
  }

  private initEventHandlers(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.refresh();
      this.clampView();
    });
    resizeObserver.observe(this.domElement);

    let keyDown: number | undefined = undefined;
    let mouseDownVector: NumericVector | undefined = undefined;

    document.body.addEventListener('keydown', (event: KeyboardEvent) => {
      const key = parseInt(event.key);
      if (key > 0 && key < 10) {
        keyDown = key;
      }
    });

    document.body.addEventListener('keyup', () => {
      keyDown = undefined;
    });

    this.domElement.addEventListener('click', (event: MouseEvent) => {
      const coords = createVector(
        transposeCoordsBackward([event.offsetX, event.offsetY], this.viewConfig.offset, this.viewConfig.scale),
      );
      this.eventManager.triggerClick({
        coords,
        extraKey: keyDown,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      });
    });

    this.domElement.addEventListener('wheel', (event: WheelEvent) => {
      if (event.ctrlKey) {
        let scale = this.viewConfig.scale[0];
        scale += event.deltaY * -0.002;

        const oldScalePosition = createVector(
          transposeCoordsBackward([event.offsetX, event.offsetY], this.viewConfig.offset, this.viewConfig.scale),
        );
        this.viewConfig.scale = [scale, scale];
        this.clampView();
        const newScalePosition = createVector(
          transposeCoordsBackward([event.offsetX, event.offsetY], this.viewConfig.offset, this.viewConfig.scale),
        );
        const difference = newScalePosition.clone().sub(oldScalePosition);
        this.viewConfig.offset = transposeCoordsForward(
          difference,
          this.viewConfig.offset,
          this.viewConfig.scale,
        );
        this.clampView();
      } else if (event.shiftKey) {
        this.viewConfig.offset[0] -= event.deltaY;
        this.clampView();
      } else {
        this.viewConfig.offset[1] -= event.deltaY;
        this.clampView();
      }

      event.preventDefault();
    });

    const mouseDownHandler = (event: MouseEvent | TouchEvent) => {
      const coords = (event instanceof MouseEvent)
        ? createVector([event.offsetX, event.offsetY])
        : createVector([event.touches[0].clientX, event.touches[0].clientY]);
      document.body.style.cursor = 'grabbing';

      try {
        this.eventManager.triggerMouseDown({
          coords: transposeCoordsBackward(coords, this.viewConfig.offset, this.viewConfig.scale),
          extraKey: keyDown,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        });
      } catch (e) {
        return;
      }

      mouseDownVector = coords;
    };
    const mouseUpHandler = (event: MouseEvent | TouchEvent) => {
      const coords = (event instanceof MouseEvent)
        ? createVector([event.offsetX, event.offsetY])
        : createVector([event.touches[0].clientX, event.touches[0].clientY]);
      mouseDownVector = undefined;
      document.body.style.cursor = 'auto';

      this.eventManager.triggerMouseUp({
        coords: transposeCoordsBackward(coords, this.viewConfig.offset, this.viewConfig.scale),
        extraKey: keyDown,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      });
    };
    const mouseMoveHandler = (event: MouseEvent | TouchEvent) => {
      const coords = (event instanceof MouseEvent)
        ? createVector([event.offsetX, event.offsetY])
        : createVector([event.touches[0].clientX, event.touches[0].clientY]);

      this.eventManager.triggerMouseMove({
        coords: transposeCoordsBackward(coords, this.viewConfig.offset, this.viewConfig.scale),
        extraKey: keyDown,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      });

      if (mouseDownVector === undefined) {
        return;
      }

      this.eventManager.triggerMouseGrab({
        coords: transposeCoordsBackward(coords, this.viewConfig.offset, this.viewConfig.scale),
        extraKey: keyDown,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      });

      const diff = coords.clone().sub(mouseDownVector);

      this.viewConfig.offset[0] += diff[0];
      this.viewConfig.offset[1] += diff[1];
      this.clampView();
      mouseDownVector = coords;
    };

    this.domElement.addEventListener('mousedown', mouseDownHandler);
    document.body.addEventListener('mouseup', mouseUpHandler);
    document.body.addEventListener('mouseleave', mouseUpHandler);
    this.domElement.addEventListener('mousemove', mouseMoveHandler);

    this.domElement.addEventListener('touchstart', mouseDownHandler);
    document.body.addEventListener('touchend', mouseUpHandler);
    this.domElement.addEventListener('touchmove', mouseMoveHandler);
  }

  get width(): number {
    return this.domElement.clientWidth;
  }

  get height(): number {
    return this.domElement.clientHeight;
  }
}

export function create2dDrawer(
  canvasId: string,
  worldConfig: WorldConfig,
  typesConfig: TypesConfig,
  showConfig: ShowConfig,
) {
  return new Drawer2d({
    domElement: document.getElementById(canvasId) as HTMLCanvasElement,
    viewConfig: {
      offset: [0, 0],
      scale: [1, 1],
    },
    showConfig,
    worldConfig,
    typesConfig,
  });
}

export function createDefaultShowConfig(): ShowConfig {
  return {
    showAtoms: true,
    showLinks: true,
    showBounds: true,
  }
}
