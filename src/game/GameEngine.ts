import {
  BELT,
  CHORDS,
  FEATURES,
  FEVER,
  FULL_RUN_LEVEL_IDS,
  GAMEPLAY,
  ISLANDS,
  LEVEL_DEFINITIONS,
  OWL_LINES,
  PARCEL_TYPES,
  TOTAL_SCORING_DURATION,
  TUTORIAL,
} from '../config/gameConfig';
import { judge, needleAt, needleSpeedFor, zoneFor } from './PowerBar';
import type {
  ChargingState,
  GameMode,
  GameSnapshot,
  LevelDefinition,
  LevelId,
  ParcelState,
  ParcelType,
  PowerZone,
  ResultEvent,
  ResultKind,
  RunKind,
  RunResult,
  RunStats,
  StageTransitionSnapshot,
  TransitionDefinition,
  TutorialSnapshot,
} from './types';

type AttractShot = 'PERFECT' | 'GOOD' | 'MISS';

const TIME_EPSILON = 1e-9;

const EMPTY_STATS = (): RunStats => ({
  score: 0,
  delivered: 0,
  perfect: 0,
  fragileSmashed: 0,
  missed: 0,
  maxStreak: 0,
  feverUsed: 0,
});

export class GameEngine {
  onSnapshot: (snapshot: GameSnapshot) => void = () => undefined;
  onResult: (result: ResultEvent) => void = () => undefined;
  onFeverReady: () => void = () => undefined;
  onFeverStart: () => void = () => undefined;
  onTutorialStart: (tutorial: TutorialSnapshot) => void = () => undefined;
  onLevelStart: (level: LevelDefinition) => void = () => undefined;
  onTransitionStart: (transition: StageTransitionSnapshot) => void = () => undefined;
  onEnd: (result: RunResult) => void = () => undefined;
  onExpress: (parcel: ParcelState) => void = () => undefined;
  onChordHint: (parcel: ParcelState) => void = () => undefined;
  onStageTransitionStart: () => void = () => undefined;

  private mode: GameMode = 'title';
  private runKind: RunKind = 'full';
  private currentLevelId: LevelId = 'slow';
  private clock = 0;
  private runTime = 0;
  private shiftElapsed = 0;
  private tutorialElapsed: number | null = null;
  private tutorialCardIndex = 0;
  private transition: { elapsed: number; definition: TransitionDefinition } | null = null;
  private queue: ParcelState[] = [];
  private nextParcelId = 1;
  private nextSpawnDelay = 0;
  private preparedParcelId: number | null = null;
  private charging: ChargingState | null = null;
  private selectedIslandId: number = LEVEL_DEFINITIONS.slow.islandIds[0];
  private completedScriptedFirsts = new Set<number>();
  private streak = 0;
  private feverCharge = 0;
  private feverFilled = false;
  private feverActive = false;
  private feverRemaining = 0;
  private stats = EMPTY_STATS();
  private owlText = '';
  private attractShot: AttractShot | null = null;
  private attractOffset = 0;
  private attractDirection = 1;
  private attractFeverDelay: number | null = null;

  constructor(private readonly getIslandDistance: (id: number) => number) {
    this.seedInitialQueue();
    this.prepareFrontParcel();
  }

  get timeline(): number {
    return this.clock;
  }

  start(): void {
    this.resetRun('full');
    this.mode = 'tutorial';
    this.tutorialElapsed = 0;
    this.tutorialCardIndex = 0;
    this.seedInitialQueue();
    this.prepareFrontParcel();
    this.onTutorialStart(this.getTutorialSnapshot() as TutorialSnapshot);
    this.emitSnapshot();
  }

  startFullRun(): void {
    this.resetRun('full');
    this.beginLevel(FULL_RUN_LEVEL_IDS[0]);
    this.emitSnapshot();
  }

  startPractice(levelId: LevelId): void {
    this.resetRun('practice');
    this.advanceToLevel(levelId, LEVEL_DEFINITIONS[levelId].practiceTransition);
    this.emitSnapshot();
  }

  nextTutorialStep(): void {
    if (this.mode !== 'tutorial') return;
    if (this.tutorialCardIndex < TUTORIAL.cards.length - 1) {
      this.tutorialCardIndex += 1;
      this.emitSnapshot();
      return;
    }
    this.skipTutorial();
  }

  prevTutorialStep(): void {
    if (this.mode !== 'tutorial' || this.tutorialCardIndex <= 0) return;
    this.tutorialCardIndex -= 1;
    this.emitSnapshot();
  }

  goToTutorialStep(index: number): void {
    if (this.mode !== 'tutorial') return;
    if (index < 0 || index >= TUTORIAL.cards.length || index === this.tutorialCardIndex) return;
    this.tutorialCardIndex = index;
    this.emitSnapshot();
  }

  skipTutorial(): void {
    if (this.mode !== 'tutorial') return;
    this.resetDemoProgress();
    this.beginLevel(FULL_RUN_LEVEL_IDS[0]);
    this.emitSnapshot();
  }

  confirmTransition(): void {
    if (this.mode !== 'transition' || !this.transition) return;
    this.beginLevel(this.transition.definition.nextLevelId);
    this.emitSnapshot();
  }

  returnToTitle(): void {
    this.resetRun('full');
    this.mode = 'title';
    this.owlText = '';
    this.seedInitialQueue();
    this.prepareFrontParcel();
    this.emitSnapshot();
  }

  update(deltaTime: number): void {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;

    this.clock += deltaTime;
    let updateRemaining = deltaTime;

    while (updateRemaining > 0) {
      if (this.mode === 'title' || this.mode === 'ended') {
        if (this.mode === 'title') {
          this.updateActiveParcels(updateRemaining);
          this.updateAttractAi(updateRemaining);
        }
        break;
      }

      if (this.mode === 'tutorial') {
        this.tutorialElapsed = (this.tutorialElapsed ?? 0) + updateRemaining;
        this.updateActiveParcels(updateRemaining);
        this.updateAttractAi(updateRemaining);
        break;
      }

      if (this.mode === 'transition' && this.transition) {
        this.transition.elapsed += updateRemaining;
        this.shiftElapsed += updateRemaining;
        break;
      }

      if (this.mode === 'playing') {
        const step = Math.min(updateRemaining, Math.max(0, this.level.duration - this.runTime));
        this.runTime += step;
        this.shiftElapsed += step;
        this.updateActiveParcels(step);
        updateRemaining -= step;

        if (this.runTime >= this.level.duration - TIME_EPSILON) this.completeLevel();
        continue;
      }

      break;
    }

    this.emitSnapshot();
  }

  pressIsland(id: number): void {
    if (this.mode !== 'playing') return;
    this.beginCharge(id);
    this.emitSnapshot();
  }

  retargetIsland(id: number): void {
    if (this.mode !== 'playing' || !this.charging) return;
    if (!this.isFrontParcelReady() || !this.level.islandIds.some((islandId) => islandId === id)) return;

    this.selectedIslandId = id;
    this.charging.islandId = id;
    this.emitSnapshot();
  }

  releaseIsland(id: number): void {
    if (this.mode !== 'playing') return;
    this.releaseCharge(id);
    this.emitSnapshot();
  }

  activateFever(): void {
    if (this.mode !== 'playing') return;
    this.activateFilledFever();
    this.emitSnapshot();
  }

  getSnapshot(): GameSnapshot {
    const frontParcel = this.queue[0] ?? null;
    const zoneIslandId = this.charging?.islandId ?? frontParcel?.targetIslandId ?? this.selectedIslandId;
    const parcelType = frontParcel?.type ?? 'NORMAL';

    return {
      mode: this.mode,
      levelId: this.currentLevelId,
      runKind: this.runKind,
      tutorial: this.getTutorialSnapshot(),
      stageId: this.level.sceneId,
      activeIslandIds: [...this.level.islandIds],
      allowChords: this.level.allowChords,
      driftScale: this.level.driftScale,
      stageTransition: this.transition ? {
        ...this.transition.definition,
        elapsed: this.transition.elapsed,
      } : null,
      runTime: this.runTime,
      runLength: this.level.duration,
      remaining: Math.max(0, this.level.duration - this.runTime),
      score: this.stats.score,
      combo: this.streak,
      maxStreak: this.stats.maxStreak,
      speedStep: this.level.needleStep,
      multiplier: this.level.multiplier,
      beltSpeed: this.level.beltSpeed,
      beltFlowSpeed: this.mode === 'transition' || this.mode === 'ended' ? 0 : this.currentBeltFlowSpeed(),
      frontParcel: frontParcel ? this.copyParcel(frontParcel) : null,
      parcelReady: this.isFrontParcelReady(),
      queue: this.queue.map((parcel) => this.copyParcel(parcel)),
      charging: this.charging ? { ...this.charging } : null,
      selectedIslandId: this.selectedIslandId,
      zone: zoneFor(this.getIslandDistance(zoneIslandId), parcelType, this.feverActive),
      zoneIslandId,
      feverProgress: this.feverFilled ? 1 : this.feverCharge / FEVER.deliveriesToFill,
      feverFilled: this.feverFilled,
      feverActive: this.feverActive,
      feverRemaining: this.feverRemaining,
      owlText: this.owlText,
    };
  }

  getStats(): RunStats {
    return { ...this.stats };
  }

  private get level(): LevelDefinition {
    return LEVEL_DEFINITIONS[this.currentLevelId];
  }

  private get isAutoDemo(): boolean {
    return this.mode === 'title' || this.mode === 'tutorial';
  }

  private resetRun(runKind: RunKind): void {
    this.mode = 'title';
    this.runKind = runKind;
    this.currentLevelId = FULL_RUN_LEVEL_IDS[0];
    this.runTime = 0;
    this.shiftElapsed = 0;
    this.tutorialElapsed = null;
    this.tutorialCardIndex = 0;
    this.transition = null;
    this.queue = [];
    this.nextParcelId = 1;
    this.nextSpawnDelay = 0;
    this.preparedParcelId = null;
    this.charging = null;
    this.selectedIslandId = this.level.islandIds[0];
    this.completedScriptedFirsts.clear();
    this.streak = 0;
    this.feverCharge = 0;
    this.feverFilled = false;
    this.feverActive = false;
    this.feverRemaining = 0;
    this.stats = EMPTY_STATS();
    this.owlText = OWL_LINES.start;
    this.attractShot = null;
    this.attractFeverDelay = null;
  }

  private resetDemoProgress(): void {
    this.streak = 0;
    this.feverCharge = 0;
    this.feverFilled = false;
    this.feverActive = false;
    this.feverRemaining = 0;
    this.stats = EMPTY_STATS();
    this.attractShot = null;
    this.attractFeverDelay = null;
  }

  private advanceToLevel(levelId: LevelId, transition: TransitionDefinition | undefined): void {
    this.currentLevelId = levelId;
    this.runTime = 0;

    if (transition) this.beginTransition(transition);
    else this.beginLevel(levelId);
  }

  private beginLevel(levelId: LevelId): void {
    this.mode = 'playing';
    this.currentLevelId = levelId;
    this.runTime = 0;
    this.tutorialElapsed = null;
    this.transition = null;
    this.clearParcelState();
    this.completedScriptedFirsts.clear();
    this.selectedIslandId = this.level.islandIds[0];
    this.owlText = levelId === 'slow'
      ? OWL_LINES.start
      : levelId === 'normal'
        ? `${OWL_LINES.speedup} Watch for Fragile & Express!`
        : `${OWL_LINES.rush} Hold two buttons for chords!`;
    this.onLevelStart(this.level);
    this.seedInitialQueue();
    this.prepareFrontParcel();
  }

  private completeLevel(): void {
    if (this.runKind === 'full') {
      const currentIndex = FULL_RUN_LEVEL_IDS.indexOf(this.currentLevelId);
      const nextLevelId = FULL_RUN_LEVEL_IDS[currentIndex + 1];
      if (nextLevelId) {
        this.advanceToLevel(nextLevelId, LEVEL_DEFINITIONS[nextLevelId].transition);
        return;
      }
    }

    this.endRun();
  }

  private beginTransition(definition: TransitionDefinition): void {
    this.mode = 'transition';
    this.currentLevelId = definition.nextLevelId;
    this.runTime = 0;
    this.tutorialElapsed = null;
    this.transition = { elapsed: 0, definition };
    this.clearParcelState();
    this.owlText = definition.description;
    const snapshot = this.getTransitionSnapshot();
    if (snapshot) this.onTransitionStart(snapshot);
    this.onStageTransitionStart();
  }

  private clearParcelState(): void {
    this.queue = [];
    this.preparedParcelId = null;
    this.nextSpawnDelay = 0;
    this.charging = null;
    this.attractShot = null;
  }

  private getTutorialSnapshot(): TutorialSnapshot | null {
    if (this.tutorialElapsed === null) return null;
    return {
      elapsed: this.tutorialElapsed,
      duration: TUTORIAL.duration,
      cardIndex: this.tutorialCardIndex,
      totalCards: TUTORIAL.cards.length,
    };
  }

  private getTransitionSnapshot(): StageTransitionSnapshot | null {
    return this.transition ? {
      ...this.transition.definition,
      elapsed: this.transition.elapsed,
    } : null;
  }

  private isFrontParcelReady(): boolean {
    const frontParcel = this.queue[0];
    return frontParcel !== undefined && this.preparedParcelId === frontParcel.id;
  }

  private currentBeltFlowSpeed(): number {
    const frontParcel = this.queue[0];
    const needsCatchup = !frontParcel || frontParcel.beltX < BELT.catchupThresholdX;
    return BELT.moveSpeed * this.level.beltSpeed * (needsCatchup ? BELT.emptyCatchupMultiplier : 1);
  }

  private randomSpawnDelay(): number {
    const delay = BELT.spawnDelayMin + Math.random() * (BELT.spawnDelayMax - BELT.spawnDelayMin);
    return delay / this.level.beltSpeed;
  }

  private updateActiveParcels(deltaTime: number): void {
    if (this.feverActive) {
      this.feverRemaining = Math.max(0, this.feverRemaining - deltaTime);
      if (this.feverRemaining === 0) this.feverActive = false;
    }

    this.advanceParcels(deltaTime);

    if (this.charging) {
      this.charging.elapsed += deltaTime;
      const frontParcel = this.queue[0];
      if (frontParcel) {
        this.charging.power = needleAt(
          this.charging.elapsed,
          needleSpeedFor(frontParcel.type, this.level.needleStep),
        );
      }
    }

    const frontParcel = this.queue[0];
    if (frontParcel && this.preparedParcelId === frontParcel.id && frontParcel.beltX >= BELT.launchX) {
      if (frontParcel.expressRemaining !== null) {
        frontParcel.expressRemaining = Math.max(0, frontParcel.expressRemaining - deltaTime);
      }
      if (frontParcel.expressRemaining === 0) {
        this.removeFrontParcel('EXPIRED');
      } else {
        const waitDecay = this.charging ? deltaTime * 0.25 : deltaTime;
        frontParcel.waitRemaining = Math.max(0, frontParcel.waitRemaining - waitDecay);
        if (frontParcel.waitRemaining === 0) {
          this.removeFrontParcel('DROPPED');
        }
      }
    }

    this.trySpawnParcel(deltaTime);
    this.updateQueuePositions();
  }

  private advanceParcels(deltaTime: number): void {
    const flowSpeed = this.currentBeltFlowSpeed();
    for (let i = 0; i < this.queue.length; i += 1) {
      const parcel = this.queue[i];
      const limitX = i === 0 ? BELT.launchX : this.queue[i - 1].beltX - BELT.parcelSpacing;
      if (parcel.beltX < limitX) {
        parcel.beltX = Math.min(limitX, parcel.beltX + flowSpeed * deltaTime);
      }
    }

    const frontParcel = this.queue[0];
    if (frontParcel && this.preparedParcelId !== frontParcel.id) {
      this.prepareFrontParcel();
    }
  }

  private updateAttractAi(deltaTime: number): void {
    if (this.feverFilled && !this.feverActive) {
      this.attractFeverDelay ??= 0.5 + Math.random();
      this.attractFeverDelay -= deltaTime;
      if (this.attractFeverDelay <= 0) {
        this.activateFilledFever();
        this.attractFeverDelay = null;
      }
    } else {
      this.attractFeverDelay = null;
    }

    const frontParcel = this.queue[0];
    if (!frontParcel || !this.isFrontParcelReady() || frontParcel.beltX < BELT.launchX) return;

    if (!this.charging) {
      this.beginCharge(frontParcel.targetIslandId);
      return;
    }

    if (this.charging.elapsed < GAMEPLAY.attractAi.minHold || !this.attractShot) return;

    const zone = zoneFor(
      this.getIslandDistance(this.charging.islandId),
      frontParcel.type,
      this.feverActive,
    );
    let targetPower: number;

    if (this.attractShot === 'PERFECT') {
      targetPower = zone.center + this.attractOffset * zone.goldHalfWidth;
    } else if (this.attractShot === 'GOOD') {
      const inner = zone.goldHalfWidth + GAMEPLAY.attractAi.releaseTolerance;
      const outer = Math.max(inner, zone.greenHalfWidth * 0.9);
      targetPower = zone.center + this.attractDirection * (inner + (outer - inner) * Math.abs(this.attractOffset));
    } else {
      targetPower = zone.center > 0.5
        ? Math.max(0, zone.center - zone.greenHalfWidth - 0.12)
        : Math.min(1, zone.center + zone.greenHalfWidth + 0.12);
    }

    if (
      Math.abs(this.charging.power - targetPower) <= GAMEPLAY.attractAi.releaseTolerance
      || this.charging.elapsed >= GAMEPLAY.attractAi.maxHold
    ) {
      this.releaseCharge(this.charging.islandId);
    }
  }

  private beginCharge(id: number): void {
    const frontParcel = this.queue[0];
    if (this.charging || !frontParcel || !this.isFrontParcelReady()) return;
    if (!this.level.islandIds.some((islandId) => islandId === id)) return;

    this.selectedIslandId = id;
    this.charging = { islandId: id, power: 0, elapsed: 0 };

    if (this.isAutoDemo) {
      const roll = Math.random();
      this.attractShot = roll < GAMEPLAY.attractAi.perfectChance
        ? 'PERFECT'
        : roll < GAMEPLAY.attractAi.perfectChance + GAMEPLAY.attractAi.goodChance
          ? 'GOOD'
          : 'MISS';
      this.attractOffset = Math.random() * 1.4 - 0.7;
      this.attractDirection = Math.random() < 0.5 ? -1 : 1;
    }
  }

  private releaseCharge(id: number): void {
    if (!this.charging || this.charging.islandId !== id || !this.isFrontParcelReady()) return;

    const parcel = this.queue[0];
    if (!parcel) {
      this.charging = null;
      return;
    }

    const charging = this.charging;
    const power = needleAt(charging.elapsed, needleSpeedFor(parcel.type, this.level.needleStep));
    const zone = zoneFor(this.getIslandDistance(id), parcel.type, this.feverActive);
    let kind: ResultKind;

    if (id !== parcel.targetIslandId) {
      kind = 'WRONG ISLAND';
    } else {
      kind = judge(power, zone);
    }

    this.owlText = kind === 'PERFECT'
      ? OWL_LINES.perfect
      : kind === 'GOOD'
        ? this.owlText
        : OWL_LINES.miss;

    let scoreAwarded = 0;
    if (kind === 'PERFECT' || kind === 'GOOD') {
      const baseScore = kind === 'PERFECT' ? PARCEL_TYPES[parcel.type].perfectScore : PARCEL_TYPES[parcel.type].goodScore;
      scoreAwarded = Math.round(baseScore * this.level.multiplier * (this.feverActive ? FEVER.scoreMultiplier : 1));
      this.registerSuccess(kind, scoreAwarded);
    } else {
      if (!this.isAutoDemo && kind === 'TOO STRONG' && parcel.type === 'FRAGILE') this.stats.fragileSmashed += 1;
      this.registerMiss();
    }

    this.emitResult(kind, parcel, id, power, zone, scoreAwarded);
    this.queue.shift();
    this.preparedParcelId = null;
    this.charging = null;
    this.attractShot = null;
    this.updateQueuePositions();
    this.prepareFrontParcel();
  }

  private removeFrontParcel(kind: Extract<ResultKind, 'DROPPED' | 'EXPIRED'>): void {
    const parcel = this.queue.shift();
    if (!parcel) return;

    this.preparedParcelId = null;
    this.charging = null;
    this.attractShot = null;
    this.registerMiss();
    this.owlText = OWL_LINES.miss;
    this.emitResult(kind, parcel, parcel.targetIslandId, 0, this.zoneForParcel(parcel));
    this.updateQueuePositions();
    this.prepareFrontParcel();
  }

  private registerSuccess(kind: 'PERFECT' | 'GOOD', scoreAwarded: number): void {
    if (!this.isAutoDemo) {
      this.stats.score += scoreAwarded;
      this.stats.delivered += 1;
      if (kind === 'PERFECT') this.stats.perfect += 1;
      this.streak += 1;
      this.stats.maxStreak = Math.max(this.stats.maxStreak, this.streak);
    }

    if (!this.feverFilled && !this.feverActive) {
      this.feverCharge = Math.min(FEVER.deliveriesToFill, this.feverCharge + 1);
      if (this.feverCharge >= FEVER.deliveriesToFill) {
        this.feverFilled = true;
        if (FEATURES.manualFever) {
          this.owlText = OWL_LINES.feverReady;
          this.onFeverReady();
        } else {
          this.activateFilledFever();
        }
      }
    }
  }

  private registerMiss(): void {
    if (!this.isAutoDemo) {
      this.stats.missed += 1;
      this.streak = 0;
    }
    if (!this.feverFilled && !this.feverActive) this.feverCharge = 0;
  }

  private activateFilledFever(): void {
    if (!this.feverFilled || this.feverActive) return;
    this.feverFilled = false;
    this.feverCharge = 0;
    this.feverActive = true;
    this.feverRemaining = FEVER.duration;
    if (!this.isAutoDemo) this.stats.feverUsed += 1;
    this.owlText = OWL_LINES.fever;
    this.onFeverStart();
  }

  private prepareFrontParcel(): void {
    const parcel = this.queue[0];
    if (!parcel || this.preparedParcelId === parcel.id) return;

    let chordScripted = false;
    if (this.mode === 'playing') {
      for (let index = 0; index < this.level.scriptedFirsts.length; index += 1) {
        const scripted = this.level.scriptedFirsts[index];
        if (this.completedScriptedFirsts.has(index) || this.runTime < scripted.at) continue;
        parcel.type = scripted.parcelType;
        parcel.expressRemaining = parcel.type === 'EXPRESS' ? GAMEPLAY.expressDuration : null;
        chordScripted = scripted.targetIslandIds.length > 0;
        if (chordScripted) {
          const targetIndex = Math.floor(Math.random() * scripted.targetIslandIds.length);
          parcel.targetIslandId = scripted.targetIslandIds[targetIndex];
        }
        this.completedScriptedFirsts.add(index);
        break;
      }
    }

    parcel.waitRemaining = this.level.waitWindow + (chordScripted ? CHORDS.waitWindowBonus : 0);
    this.preparedParcelId = parcel.id;
    this.updateQueuePositions();
    if (chordScripted) {
      this.owlText = OWL_LINES.chord;
      this.onChordHint(this.copyParcel(parcel));
    } else if (parcel.type === 'EXPRESS') {
      this.owlText = OWL_LINES.express;
      this.onExpress(this.copyParcel(parcel));
    }
  }

  private seedInitialQueue(): void {
    this.spawnParcel(BELT.initialX);
    this.nextSpawnDelay = BELT.initialSpawnDelay;
    this.updateQueuePositions();
  }

  private trySpawnParcel(deltaTime: number): void {
    if (this.queue.length >= BELT.maxQueueSize) return;
    if (this.queue.length === 0) {
      this.nextSpawnDelay = Math.min(this.nextSpawnDelay, BELT.emptySpawnDelay / this.level.beltSpeed);
    }
    this.nextSpawnDelay = Math.max(0, this.nextSpawnDelay - deltaTime);
    if (this.nextSpawnDelay > 0) return;

    const tail = this.queue[this.queue.length - 1];
    if (tail && tail.beltX < BELT.startX + BELT.parcelSpacing) return;

    this.spawnParcel(BELT.startX);
    this.nextSpawnDelay = this.randomSpawnDelay();
    if (this.queue.length === 1) this.prepareFrontParcel();
  }

  private spawnParcel(beltX: number): void {
    const targetIslandId = this.randomTargetIsland();
    const type = this.randomParcelType();
    this.queue.push({
      id: this.nextParcelId,
      type,
      targetIslandId,
      expressRemaining: type === 'EXPRESS' ? GAMEPLAY.expressDuration : null,
      waitRemaining: this.level.waitWindow,
      queuePosition: this.queue.length,
      beltX,
    });
    this.nextParcelId += 1;
  }

  private randomTargetIsland(): number {
    const activeIslands = ISLANDS.filter((island) => this.level.islandIds.includes(island.id));
    const chordIslandIds = activeIslands.filter((island) => island.inputs.length > 1).map((island) => island.id);
    const chordIntroduced = this.level.scriptedFirsts.some((scripted, index) => (
      scripted.targetIslandIds.length > 0 && this.completedScriptedFirsts.has(index)
    ));
    if (this.level.allowChords && chordIntroduced && chordIslandIds.length > 0 && Math.random() < CHORDS.randomTargetChance) {
      return chordIslandIds[Math.floor(Math.random() * chordIslandIds.length)];
    }
    const islandIds = activeIslands.filter((island) => island.inputs.length === 1).map((island) => island.id);
    const targetIds = islandIds.length > 0 ? islandIds : this.level.islandIds;
    return targetIds[Math.floor(Math.random() * targetIds.length)] ?? 0;
  }

  private randomParcelType(): ParcelType {
    const mix = this.level.parcelMix;
    const available = (Object.keys(mix) as ParcelType[]).filter((type) => {
      if (mix[type] <= 0) return false;
      if (this.isAutoDemo) return type === 'NORMAL';
      const scriptIndices = this.level.scriptedFirsts
        .map((scripted, index) => ({ scripted, index }))
        .filter(({ scripted }) => scripted.parcelType === type && scripted.targetIslandIds.length === 0);
      return scriptIndices.length === 0 || scriptIndices.some(({ index }) => this.completedScriptedFirsts.has(index));
    });
    const total = available.reduce((sum, type) => sum + mix[type], 0);
    if (total <= 0) return 'NORMAL';

    let roll = Math.random() * total;
    for (const type of available) {
      roll -= mix[type];
      if (roll <= 0) return type;
    }
    return available[available.length - 1] ?? 'NORMAL';
  }

  private updateQueuePositions(): void {
    this.queue.forEach((parcel, index) => {
      parcel.queuePosition = index;
    });
  }

  private zoneForParcel(parcel: ParcelState): PowerZone {
    return zoneFor(this.getIslandDistance(parcel.targetIslandId), parcel.type, this.feverActive);
  }

  private emitResult(
    kind: ResultKind,
    parcel: ParcelState,
    selectedIslandId: number,
    power: number,
    zone: PowerZone,
    scoreAwarded = 0,
  ): void {
    this.onResult({
      kind,
      parcel: this.copyParcel(parcel),
      selectedIslandId,
      power,
      scoreAwarded,
      zone: { ...zone },
    });
  }

  private endRun(): void {
    if (this.mode !== 'playing') return;
    this.runTime = this.level.duration;
    this.mode = 'ended';
    this.charging = null;
    this.attractShot = null;
    this.feverActive = false;
    this.feverRemaining = 0;
    this.owlText = OWL_LINES.end;
    this.onEnd(this.createRunResult());
  }

  private createRunResult(): RunResult {
    const scoringDuration = this.runKind === 'full' ? TOTAL_SCORING_DURATION : this.level.duration;
    const totalDuration = Math.max(scoringDuration, this.shiftElapsed);
    return {
      stats: this.getStats(),
      runKind: this.runKind,
      ...(this.runKind === 'practice' ? { levelId: this.currentLevelId } : {}),
      scoringDuration,
      totalDuration,
    };
  }

  private copyParcel(parcel: ParcelState): ParcelState {
    return { ...parcel };
  }

  private emitSnapshot(): void {
    this.onSnapshot(this.getSnapshot());
  }
}
