import type { SimulationConfig, SimulationInterface } from './types/simulation';
import type { AtomInterface } from './types/atomic';
import type { DrawerInterface } from '../drawer/types';
import type { LinkManagerInterface, RunningStateInterface } from './types/utils';
import type { InteractionManagerInterface, PhysicModelInterface } from './types/interaction';
import type { SpatialGridManagerManagerInterface } from './types/spatial';
import type { WorldSummary, SummaryManagerInterface } from '../analysis/types';
import type { GraphInterface } from "../graph/types";
import type { NumericVector } from '../math/types';
import type { Compound } from '../analysis/types';
import {
  buildEnergyReport,
  computeEnergy,
  emptyEnergyReport,
  emptyEnergySnapshot,
  type EnergyReport,
  type EnergySnapshot,
} from '../analysis/energy';
import { SpatialGridManager } from './spatial';
import { LinkManager, RulesHelper, RunningState } from '../utils/structs';
import { InteractionManager } from './interaction';
import { SummaryManager } from '../analysis/summary';
import { CompoundsCollector } from '../analysis/compounds';
import { PreventException } from "../drawer/utils";
import { toVector } from "../math";
import { createAtom } from '../utils/functions';
import { typeMass } from '../config/mass';
import { createCompoundGraphByAtom } from "../analysis/factories";
import { countEdgesGroupedByVertexTypes, countVertexesGroupedByType } from "../graph/utils";
import { scoreBilateralSymmetry, scoreSymmetryAxisByQuartering } from "../analysis/symmetry";
import { calcCompoundsClusterizationSummary, calcCompoundsClusterizationScore } from "../analysis/calc";
import { createDefaultClusterizationConfig } from "../genetic/clusters-grade-maximize/factories";
import {
  applyReferenceWeightsToCompoundsClusterizationPhenomeRow,
  convertCompoundsClusterizationScoreToPhenomeRow,
} from "../genetic/clusters-grade-maximize/converters";
import { clustersGradeMaximizeFitnessMul } from "../genetic/clusters-grade-maximize/fitness";
import { gradeMonomerPolymerPair } from "../analysis/polymers";

export class Simulation implements SimulationInterface {
  readonly config: SimulationConfig;
  private _atoms: AtomInterface[];
  private readonly _links: LinkManagerInterface;
  private readonly drawer: DrawerInterface;
  private readonly interactionManager: InteractionManagerInterface;
  private readonly spatialGridManager: SpatialGridManagerManagerInterface;
  private readonly summaryManager: SummaryManagerInterface;
  private readonly runningState: RunningStateInterface;
  private _energy: EnergyReport = emptyEnergyReport();
  private _energyInitial: EnergySnapshot | null = null;
  private _energyTracking: boolean = false;
  private readonly pairBuffer: AtomInterface[] = [];
  private _energyFrameCounter: number = 0;

  constructor(config: SimulationConfig) {
    this.config = config;
    this._atoms = this.config.atomsFactory(this.config.worldConfig, this.config.typesConfig);
    this._links = new LinkManager();
    this.drawer = this.config.drawer;
    this.summaryManager = new SummaryManager(this.config.typesConfig.FREQUENCIES.length);
    this.interactionManager = new InteractionManager(
      this.config.viewMode,
      this.config.worldConfig,
      this.config.typesConfig,
      this._links,
      this.config.physicModel,
      new RulesHelper(this.config.worldConfig, this.config.typesConfig),
      this.summaryManager,
    );
    this.spatialGridManager = new SpatialGridManager(this.config.worldConfig.MAX_INTERACTION_RADIUS);
    this.runningState = new RunningState();

    this.initEventHandlers();
  }

  get atoms(): AtomInterface[] {
    return this._atoms;
  }

  get links(): LinkManagerInterface {
    return this._links;
  }

  get summary(): WorldSummary<number[]> {
    return this.summaryManager.summary;
  }

  get energy(): EnergyReport {
    return this._energy;
  }

  get stepIndex(): number {
    return this.summaryManager.step;
  }

  get isPaused(): boolean {
    return this.runningState.isPaused;
  }

  start() {
    this.runningState.start();
    this.tick();
  }

  async stop() {
    await this.runningState.stop();
  }

  step() {
    if (!this.runningState.isPaused) {
      this.summaryManager.startStep(this.config.typesConfig);
    }

    if (this.config.worldConfig.SPEED > 0 && !this.runningState.isPaused) {
      const playback = Math.max(1, this.config.worldConfig.PLAYBACK_SPEED);
      for (let i = 0; i < playback; ++i) {
        this.interact(i === playback - 1);
      }
      if (this._energyTracking) {
        this._energyFrameCounter++;
        if (this._energyFrameCounter % 4 === 0) {
          this.refreshEnergy();
        }
      }
    }

    this.drawer.draw(this._atoms, this._links);

    if (!this.runningState.isPaused) {
      this.summaryManager.finishStep();
    }
  }

  togglePause() {
    this.runningState.togglePause();
  }

  refill() {
    this.clear();
    this._atoms = this.config.atomsFactory(
      this.config.worldConfig,
      this.config.typesConfig,
    );
  }

  clear() {
    this._atoms.length = 0;
    this.spatialGridManager.clear();
    this._links.clear();
    this.drawer.clear();
    this._energyInitial = null;
    this._energy = emptyEnergyReport();
  }

  resetEnergyBaseline(): void {
    this.refreshEnergy(true);
  }

  setEnergyTracking(enabled: boolean): void {
    this._energyTracking = enabled;
    if (enabled) {
      this.refreshEnergy();
    }
  }

  setPhysicModel(model: PhysicModelInterface): void {
    this.interactionManager.setPhysicModel(model);
    this._energyInitial = null;
  }

  async exportState(): Promise<Record<string, unknown>> {
    const needToStart = this.runningState.isRunning;
    await this.stop();

    const result = {
      atoms: this._atoms.map(atom => atom.exportState()),
      links: [...this._links].map(link => link.exportState()),
    };

    if (needToStart) {
      this.start();
    }

    return result;
  }

  async importState(state: Record<string, unknown>): Promise<void> {
    const needToStart = this.runningState.isRunning;
    await this.stop();

    this.clear();

    const atoms = state.atoms as Array<Record<string, unknown>>;
    const links = state.links as Array<number[]>;

    this._atoms = atoms.map(atom => createAtom(
      atom.type as number,
      atom.position as NumericVector,
      atom.speed as NumericVector,
      atom.id as number,
    ));

    const atomsMap = new Map<number, AtomInterface>();
    for (const atom of this._atoms) {
      atomsMap.set(atom.id, atom);
    }

    for (const link of links) {
      if (!atomsMap.has(link[0]) || !atomsMap.has(link[1])) {
        console.warn(link, atomsMap, atoms);
      }

      this._links.create(atomsMap.get(link[0])!, atomsMap.get(link[1])!, link[2] ?? 1);
    }

    if (needToStart) {
      this.start();
    }

    this._energyInitial = null;
  }

  exportCompounds(): Compound[] {
    const collector = new CompoundsCollector();
    collector.handleAtoms(this._atoms);
    return collector.getCompounds();
  }

  private refreshEnergy(resetBaseline: boolean = false): void {
    for (const atom of this._atoms) {
      this.spatialGridManager.updateAtomCell(atom);
    }

    const current = this._atoms.length === 0
      ? emptyEnergySnapshot()
      : computeEnergy({
        atoms: this._atoms,
        links: this._links,
        forEachPair: (callback) => {
          for (const atom of this._atoms) {
            this.spatialGridManager.handleAtom(atom, callback);
          }
        },
        worldConfig: this.config.worldConfig,
        typesConfig: this.config.typesConfig,
        viewMode: this.config.viewMode,
      });

    if (resetBaseline || !this._energyInitial) {
      this._energyInitial = { ...current };
    }

    this._energy = buildEnergyReport(current, this._energyInitial);
  }

  private interact(collectStockSummary: boolean = true): void {
    for (const atom of this._atoms) {
      this.interactionManager.updateAtomType(atom);
    }
    this.handleDecays();
    for (const atom of this._atoms) {
      this.interactionManager.updateAtomType(atom);
      this.interactionManager.moveAtom(atom);
      if (collectStockSummary) {
        this.summaryManager.noticeAtom(atom, this.config.worldConfig);
      }
    }
    for (const atom of this._atoms) {
      this.spatialGridManager.updateAtomCell(atom);
    }
    const pairs = this.pairBuffer;
    pairs.length = 0;
    for (const atom of this._atoms) {
      this.spatialGridManager.handleAtom(atom, (lhs, rhs) => {
        pairs.push(lhs, rhs);
      });
    }
    for (let i = 0; i < pairs.length; i += 2) {
      this.interactionManager.interactAtoms(pairs[i], pairs[i + 1]);
    }
    this.removeDeletedAtoms();
    for (const link of this._links) {
      this.interactionManager.interactLink(link);
      if (collectStockSummary) {
        this.summaryManager.noticeLink(link, this.config.worldConfig);
      }
    }
    this.interactionManager.handleTime();
  }

  private handleDecays(): void {
    const decays = this.config.typesConfig.DECAYS;
    if (!decays) {
      return;
    }

    const spawned: AtomInterface[] = [];
    const kick = this.config.worldConfig.DECAY_SPLITS_VELOCITY ?? 0;

    for (const atom of this._atoms) {
      if (atom.toDelete) {
        continue;
      }
      const rule = decays[atom.type];
      if (!rule || !(rule.halfLife > 0)) {
        continue;
      }
      if (this.isStabilized(atom, rule.stabilizers)) {
        continue;
      }
      const p = 1 - Math.pow(0.5, 1 / rule.halfLife);
      if (Math.random() >= p) {
        continue;
      }

      if (rule.to === null || rule.to === undefined) {
        this.breakAtomLinks(atom);
        atom.toDelete = true;
        continue;
      }

      if (rule.secondary === null || rule.secondary === undefined) {
        if (rule.to !== atom.type) {
          atom.newType = rule.to;
        }
        continue;
      }

      this.breakAtomLinks(atom);

      const mass1 = typeMass(this.config.typesConfig, rule.to);
      const mass2 = typeMass(this.config.typesConfig, rule.secondary);
      const massSum = mass1 + mass2 || 1;
      const dir = toVector(new Array(atom.position.length).fill(0)).random().normalize();
      const u = dir.clone().mul(kick);
      const radiusSum = this.config.worldConfig.ATOM_RADIUS * (
        this.config.typesConfig.RADIUS[rule.to] + this.config.typesConfig.RADIUS[rule.secondary]
      );
      const offset = dir.clone().mul(radiusSum + 1);

      const speed1 = atom.speed.clone().add(u.clone().mul(mass2 / massSum));
      const speed2 = atom.speed.clone().sub(u.clone().mul(mass1 / massSum));
      const pos1 = atom.position.clone().sub(offset.clone().mul(mass2 / massSum));
      const pos2 = atom.position.clone().add(offset.clone().mul(mass1 / massSum));

      atom.position.set(pos1);
      atom.speed.set(speed1);
      if (rule.to !== atom.type) {
        atom.newType = rule.to;
      }

      const child = createAtom(rule.secondary, [...pos2], [...speed2]);
      atom.linkBanWith = child.id;
      child.linkBanWith = atom.id;
      spawned.push(child);
    }

    if (spawned.length) {
      this._atoms.push(...spawned);
    }
  }

  private isStabilized(atom: AtomInterface, stabilizers?: number[]): boolean {
    if (!stabilizers || stabilizers.length === 0) {
      return false;
    }
    for (const type of stabilizers) {
      if (atom.bonds.lengthOf(type) > 0) {
        return true;
      }
    }
    return false;
  }

  private breakAtomLinks(atom: AtomInterface): void {
    for (const link of [...this._links]) {
      if (link.lhs === atom || link.rhs === atom) {
        this._links.delete(link);
      }
    }
  }

  private removeDeletedAtoms(): void {
    let write = 0;
    for (let i = 0; i < this._atoms.length; ++i) {
      const atom = this._atoms[i];
      if (atom.toDelete) {
        for (const link of [...this._links]) {
          if (link.lhs === atom || link.rhs === atom) {
            this._links.delete(link);
          }
        }
        this.spatialGridManager.detachAtom(atom);
        continue;
      }
      this._atoms[write++] = atom;
    }
    this._atoms.length = write;
  }

  private tick() {
    this.runningState.confirmStart();

    this.step();

    if (this.summaryManager.step % 30 === 0) {
      // console.log('time', this.summaryManager.step)
      // console.log('SUMMARY', this.summary);
    }

    if (this.runningState.isRunning) {
      requestAnimationFrame(() => this.tick());
    } else {
      this.runningState.confirmStop();
    }
  }

  private initEventHandlers(): void {
    if (this.drawer.eventManager === undefined) {
      return;
    }

    let grabbedAtom: AtomInterface | undefined = undefined;
    let graphCandidate: GraphInterface | undefined = undefined;

    this.drawer.eventManager.onClick((event) => {
      if (event.extraKey === undefined || event.extraKey > this.config.typesConfig.FREQUENCIES.length) {
        return;
      }
      console.log('atom added');
      this._atoms.push(createAtom(event.extraKey-1, event.coords));
    });

    this.drawer.eventManager.onMouseDown((event) => {
      console.log('MOUSE COORDS', event.coords);
      console.log('STEP INDEX', this.summaryManager.step);
      const atom = this.spatialGridManager.findAtomByCoords(
        event.coords,
        this.config.typesConfig.RADIUS,
        this.config.worldConfig.ATOM_RADIUS*2,
      );

      if (event.ctrlKey) {
        grabbedAtom = atom;
        throw new PreventException('prevent exception');
      }

      if (atom) {
        const graph = createCompoundGraphByAtom(atom, this.config.typesConfig.FREQUENCIES.length);
        const symmetryData = scoreBilateralSymmetry({
          graph,
          scoreAxisFunction: scoreSymmetryAxisByQuartering,
        });

        console.log('ATOM', atom);
        console.log('GRAPH', graph);
        console.log('COUNT VERTEXES', countVertexesGroupedByType(graph));
        console.log('COUNT EDGES', countEdgesGroupedByVertexTypes(graph));
        console.log('SYMMETRY', symmetryData);

        if (graphCandidate) {
          const polymerGrade = gradeMonomerPolymerPair(graphCandidate, graph);
          console.log('POLYMER GRADE', polymerGrade);
        }
      }

      if (event.shiftKey) {
        const clusterizationConfig = createDefaultClusterizationConfig();
        const compounds = this.exportCompounds();
        const clustersSummary = calcCompoundsClusterizationSummary(
          compounds,
          this.config.typesConfig.FREQUENCIES.length,
          clusterizationConfig.params,
        );
        const clusterizationScore = calcCompoundsClusterizationScore(clustersSummary, compounds, this);

        console.log('RAW PHENOME', clusterizationScore);

        const clusterizationMetrics = convertCompoundsClusterizationScoreToPhenomeRow(clusterizationScore);
        const totalScore = clustersGradeMaximizeFitnessMul(
          applyReferenceWeightsToCompoundsClusterizationPhenomeRow(clusterizationMetrics),
          clusterizationConfig.weights,
          true,
        );

        console.log('CLUSTERIZATION SUMMARY', clustersSummary);
        console.log('CLUSTERIZATION TOTAL SCORE', totalScore);
      }

      if (event.altKey && atom) {
        graphCandidate = createCompoundGraphByAtom(atom, this.config.typesConfig.FREQUENCIES.length);
        console.log('MONOMER CANDIDATE', graphCandidate);
      }
    });

    this.drawer.eventManager.onMouseGrab((event) => {
      if (grabbedAtom) {
        const speed = toVector(event.coords).sub(grabbedAtom.position).mul(0.2);
        grabbedAtom.speed.set(speed);
      }
    });

    this.drawer.eventManager.onMouseUp((event) => {
      grabbedAtom = undefined;
    });
  }
}
