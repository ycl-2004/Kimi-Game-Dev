import {
  FEATURES,
  FEVER,
  GAMEPLAY,
  OWL_LINES,
  PARCEL_TYPES,
  RUN_LENGTH,
  SCRIPTED_FIRSTS,
  SPEED_STEPS,
  STAGES,
} from '../config/gameConfig';
import { judge, needleAt, needleSpeedFor, zoneFor } from './PowerBar';
import type {
  ChargingState,
  GameMode,
  GameSnapshot,
  ParcelState,
  ParcelType,
  PowerZone,
  ResultEvent,
  ResultKind,
  RunStats,
} from './types';

type AttractShot = 'PERFECT' | 'GOOD' | 'MISS';

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
  onStepUp: (step: number) => void = () => undefined;
  onFeverReady: () => void = () => undefined;
  onFeverStart: () => void = () => undefined;
  onEnd: (stats: RunStats) => void = () => undefined;
  onExpress: (parcel: ParcelState) => void = () => undefined;

  private mode: GameMode = 'title';
  private clock = 0;
  private runTime = 0;
  private speedStepIndex = 0;
  private queue: ParcelState[] = [];
  private nextParcelId = 1;
  private nextParcelDelay = 0;
  private preparedParcelId: number | null = null;
  private charging: ChargingState | null = null;
  private selectedIslandId: number = STAGES[0].islandIds[0];
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
    this.fillQueue();
    this.prepareFrontParcel();
  }

  get timeline(): number {
    return this.clock;
  }

  start(): void {
    this.mode = 'playing';
    this.runTime = 0;
    this.speedStepIndex = 0;
    this.queue = [];
    this.nextParcelId = 1;
    this.nextParcelDelay = 0;
    this.preparedParcelId = null;
    this.charging = null;
    this.selectedIslandId = STAGES[0].islandIds[0];
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
    this.fillQueue();
    this.prepareFrontParcel();
    this.emitSnapshot();
  }

  update(deltaTime: number): void {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;

    this.clock += deltaTime;

    if (this.mode === 'title') {
      this.updateActiveParcels(deltaTime);
      this.updateAttractAi(deltaTime);
    } else if (this.mode === 'playing') {
      this.advanceRun(Math.min(deltaTime, RUN_LENGTH - this.runTime));
    }

    this.emitSnapshot();
  }

  pressIsland(id: number): void {
    if (this.mode !== 'playing') return;
    this.beginCharge(id);
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
    const speedStep = SPEED_STEPS[this.speedStepIndex];

    return {
      mode: this.mode,
      runTime: this.runTime,
      runLength: RUN_LENGTH,
      remaining: Math.max(0, RUN_LENGTH - this.runTime),
      score: this.stats.score,
      combo: this.streak,
      maxStreak: this.stats.maxStreak,
      speedStep: speedStep.step,
      multiplier: speedStep.multiplier,
      beltSpeed: speedStep.beltSpeed,
      frontParcel: frontParcel ? this.copyParcel(frontParcel) : null,
      parcelReady: frontParcel !== null && this.nextParcelDelay === 0,
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

  private get speedStep() {
    return SPEED_STEPS[this.speedStepIndex];
  }

  private parcelEntryDelay(): number {
    return GAMEPLAY.parcelEntryDuration / this.speedStep.beltSpeed;
  }

  private get stage() {
    return STAGES.find((stage) => this.runTime >= stage.start && this.runTime < stage.end) ?? STAGES[STAGES.length - 1];
  }

  private advanceRun(deltaTime: number): void {
    const targetTime = Math.min(RUN_LENGTH, this.runTime + Math.max(0, deltaTime));

    while (this.runTime < targetTime) {
      const nextStep = SPEED_STEPS[this.speedStepIndex + 1];
      const segmentEnd = nextStep ? Math.min(targetTime, nextStep.start) : targetTime;
      const segmentDuration = segmentEnd - this.runTime;

      if (segmentDuration <= 0) break;
      this.runTime = segmentEnd;
      this.updateActiveParcels(segmentDuration);

      if (nextStep && segmentEnd === nextStep.start && nextStep.start < RUN_LENGTH) {
        const previousBeltSpeed = this.speedStep.beltSpeed;
        this.speedStepIndex += 1;
        this.nextParcelDelay *= previousBeltSpeed / nextStep.beltSpeed;
        this.owlText = nextStep.label === 'RUSH HOUR!' ? OWL_LINES.rush : OWL_LINES.speedup;
        const frontParcel = this.queue[0];
        if (frontParcel) frontParcel.waitRemaining = Math.min(frontParcel.waitRemaining, nextStep.waitWindow);
        this.onStepUp(nextStep.step);
      }
    }

    if (this.runTime >= RUN_LENGTH) this.endRun();
  }

  private updateActiveParcels(deltaTime: number): void {
    if (this.feverActive) {
      this.feverRemaining = Math.max(0, this.feverRemaining - deltaTime);
      if (this.feverRemaining === 0) this.feverActive = false;
    }

    if (this.nextParcelDelay > 0) {
      this.nextParcelDelay = Math.max(0, this.nextParcelDelay - deltaTime);
      if (this.nextParcelDelay === 0) this.prepareFrontParcel();
    }

    if (this.charging) {
      this.charging.elapsed += deltaTime;
      const frontParcel = this.queue[0];
      if (frontParcel) {
        this.charging.power = needleAt(
          this.charging.elapsed,
          needleSpeedFor(frontParcel.type, this.speedStep.step),
        );
      }
    }

    for (const parcel of this.queue) {
      if (parcel.expressRemaining !== null) {
        parcel.expressRemaining = Math.max(0, parcel.expressRemaining - deltaTime);
      }
    }

    const expiredIds = this.queue
      .filter((parcel) => parcel.expressRemaining === 0)
      .map((parcel) => parcel.id);

    for (const id of expiredIds) {
      const index = this.queue.findIndex((parcel) => parcel.id === id);
      if (index === 0) {
        this.removeFrontParcel('EXPIRED');
      } else if (index > 0) {
        const [parcel] = this.queue.splice(index, 1);
        this.registerMiss();
        this.emitResult('EXPIRED', parcel, parcel.targetIslandId, 0, this.zoneForParcel(parcel));
      }
    }

    if (expiredIds.length > 0) {
      this.updateQueuePositions();
      this.fillQueue();
    }

    const frontParcel = this.queue[0];
    if (frontParcel && this.nextParcelDelay === 0 && this.preparedParcelId === frontParcel.id) {
      frontParcel.waitRemaining = Math.max(0, frontParcel.waitRemaining - deltaTime);
      if (frontParcel.waitRemaining === 0) this.removeFrontParcel('DROPPED');
    }

    this.fillQueue();
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
    if (!frontParcel || this.nextParcelDelay > 0) return;

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
    if (
      this.charging
      || this.nextParcelDelay > 0
      || !frontParcel
      || this.preparedParcelId !== frontParcel.id
    ) return;
    if (!this.stage.islandIds.some((islandId) => islandId === id)) return;

    this.selectedIslandId = id;
    this.charging = { islandId: id, power: 0, elapsed: 0 };

    if (this.mode === 'title') {
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
    if (!this.charging || this.charging.islandId !== id || this.nextParcelDelay > 0) return;

    const parcel = this.queue[0];
    if (!parcel) {
      this.charging = null;
      return;
    }

    const charging = this.charging;
    const power = needleAt(charging.elapsed, needleSpeedFor(parcel.type, this.speedStep.step));
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
      scoreAwarded = Math.round(baseScore * this.speedStep.multiplier * (this.feverActive ? FEVER.scoreMultiplier : 1));
      this.registerSuccess(kind, scoreAwarded);
    } else {
      if (kind === 'TOO STRONG' && parcel.type === 'FRAGILE') this.stats.fragileSmashed += 1;
      this.registerMiss();
    }

    this.emitResult(kind, parcel, id, power, zone, scoreAwarded);
    this.queue.shift();
    this.preparedParcelId = null;
    this.charging = null;
    this.attractShot = null;
    this.nextParcelDelay = this.parcelEntryDelay();
    this.fillQueue();
    this.updateQueuePositions();
  }

  private removeFrontParcel(kind: Extract<ResultKind, 'DROPPED' | 'EXPIRED'>): void {
    const parcel = this.queue.shift();
    if (!parcel) return;

    this.preparedParcelId = null;
    this.charging = null;
    this.attractShot = null;
    this.nextParcelDelay = this.parcelEntryDelay();
    this.registerMiss();
    this.owlText = OWL_LINES.miss;
    this.emitResult(kind, parcel, parcel.targetIslandId, 0, this.zoneForParcel(parcel));
    this.fillQueue();
    this.updateQueuePositions();
  }

  private registerSuccess(kind: 'PERFECT' | 'GOOD', scoreAwarded: number): void {
    this.stats.score += scoreAwarded;
    this.stats.delivered += 1;
    if (kind === 'PERFECT') this.stats.perfect += 1;
    this.streak += 1;
    this.stats.maxStreak = Math.max(this.stats.maxStreak, this.streak);

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
    this.stats.missed += 1;
    this.streak = 0;
    if (!this.feverFilled && !this.feverActive) this.feverCharge = 0;
  }

  private activateFilledFever(): void {
    if (!this.feverFilled || this.feverActive) return;
    this.feverFilled = false;
    this.feverCharge = 0;
    this.feverActive = true;
    this.feverRemaining = FEVER.duration;
    this.stats.feverUsed += 1;
    this.owlText = OWL_LINES.fever;
    this.onFeverStart();
  }

  private prepareFrontParcel(): void {
    const parcel = this.queue[0];
    if (!parcel || this.preparedParcelId === parcel.id) return;

    if (this.mode === 'playing') {
      for (let index = 0; index < SCRIPTED_FIRSTS.length; index += 1) {
        const scripted = SCRIPTED_FIRSTS[index];
        if (this.completedScriptedFirsts.has(index) || this.runTime < scripted.at) continue;
        parcel.type = scripted.parcelType;
        parcel.expressRemaining = parcel.type === 'EXPRESS' ? GAMEPLAY.expressDuration : null;
        this.completedScriptedFirsts.add(index);
        break;
      }
    }

    parcel.waitRemaining = this.speedStep.waitWindow;
    this.preparedParcelId = parcel.id;
    this.updateQueuePositions();
    if (parcel.type === 'EXPRESS') {
      this.owlText = OWL_LINES.express;
      this.onExpress(this.copyParcel(parcel));
    }
  }

  private fillQueue(): void {
    while (this.queue.length < GAMEPLAY.queueSize) {
      const targetIslandId = this.randomTargetIsland();
      const type = this.randomParcelType();
      this.queue.push({
        id: this.nextParcelId,
        type,
        targetIslandId,
        expressRemaining: type === 'EXPRESS' ? GAMEPLAY.expressDuration : null,
        waitRemaining: this.speedStep.waitWindow,
        queuePosition: this.queue.length,
      });
      this.nextParcelId += 1;
    }
    this.updateQueuePositions();
  }

  private randomTargetIsland(): number {
    const islandIds = this.stage.islandIds;
    return islandIds[Math.floor(Math.random() * islandIds.length)];
  }

  private randomParcelType(): ParcelType {
    const mix = this.speedStep.mix;
    const available = (Object.keys(mix) as ParcelType[]).filter((type) => {
      if (mix[type] <= 0) return false;
      if (this.mode === 'title') return type === 'NORMAL';
      const scriptIndices = SCRIPTED_FIRSTS
        .map((scripted, index) => ({ scripted, index }))
        .filter(({ scripted }) => scripted.parcelType === type);
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
    this.runTime = RUN_LENGTH;
    this.mode = 'ended';
    this.charging = null;
    this.attractShot = null;
    this.feverActive = false;
    this.feverRemaining = 0;
    this.owlText = OWL_LINES.end;
    this.onEnd(this.getStats());
  }

  private copyParcel(parcel: ParcelState): ParcelState {
    return { ...parcel };
  }

  private emitSnapshot(): void {
    this.onSnapshot(this.getSnapshot());
  }
}
