import type { ISLANDS, PARCEL_TYPES } from '../config/gameConfig';

export type ParcelType = keyof typeof PARCEL_TYPES;
export type LevelId = 'slow' | 'normal' | 'sunset';
export type SceneId = 'day' | 'sunset';
export type RunKind = 'full' | 'practice';
export type GameMode = 'title' | 'tutorial' | 'playing' | 'transition' | 'ended';
export type TransitionKind = 'speed' | 'chords';
export type ResultKind = 'PERFECT' | 'GOOD' | 'TOO WEAK' | 'TOO STRONG' | 'WRONG ISLAND' | 'DROPPED' | 'EXPIRED';

export interface IslandDefinition {
  id: number;
  name: string;
  short: string;
  color: string;
  icon: string;
  inputs: readonly string[];
  baseDistance: number;
  driftAmp: number;
  driftPeriod: number;
  driftPhase: number;
  x: number;
  stage2X: number;
  elevation: number;
}

export type IslandId = (typeof ISLANDS)[number]['id'];

export interface ScriptedParcelFirst {
  at: number;
  parcelType: ParcelType;
  targetIslandIds: readonly number[];
}

export interface TransitionDefinition {
  kind: TransitionKind;
  duration: number;
  title: string;
  description: string;
  nextLevelId: LevelId;
}

export interface LevelDefinition {
  id: LevelId;
  name: string;
  sceneId: SceneId;
  duration: number;
  beltSpeed: number;
  waitWindow: number;
  multiplier: number;
  needleStep: number;
  islandIds: readonly number[];
  driftScale: number;
  allowChords: boolean;
  parcelMix: Readonly<Record<ParcelType, number>>;
  scriptedFirsts: readonly ScriptedParcelFirst[];
  transition?: TransitionDefinition;
  practiceTransition?: TransitionDefinition;
}

export interface TutorialCard {
  image: string;
  title: string;
  description: string;
}

export interface TutorialDefinition {
  duration: number;
  cards: readonly TutorialCard[];
}

export interface TutorialSnapshot {
  elapsed: number;
  duration: number;
  cardIndex: number;
  totalCards: number;
}

export interface ParcelState {
  id: number;
  type: ParcelType;
  targetIslandId: number;
  expressRemaining: number | null;
  waitRemaining: number;
  queuePosition: number;
  beltX: number;
}

export interface PowerZone {
  center: number;
  greenHalfWidth: number;
  goldHalfWidth: number;
}

export interface ChargingState {
  islandId: number;
  power: number;
  elapsed: number;
}

export interface RunStats {
  score: number;
  delivered: number;
  perfect: number;
  fragileSmashed: number;
  missed: number;
  maxStreak: number;
  feverUsed: number;
}

export interface RunResult {
  stats: RunStats;
  runKind: RunKind;
  levelId?: LevelId;
  scoringDuration: number;
  totalDuration: number;
}

export interface StageTransitionSnapshot extends TransitionDefinition {
  elapsed: number;
}

export interface GameSnapshot {
  mode: GameMode;
  levelId: LevelId;
  runKind: RunKind;
  tutorial: TutorialSnapshot | null;
  stageId: SceneId;
  activeIslandIds: number[];
  allowChords: boolean;
  driftScale: number;
  stageTransition: StageTransitionSnapshot | null;
  runTime: number;
  runLength: number;
  remaining: number;
  score: number;
  combo: number;
  maxStreak: number;
  speedStep: number;
  multiplier: number;
  beltSpeed: number;
  beltFlowSpeed: number;
  frontParcel: ParcelState | null;
  parcelReady: boolean;
  queue: ParcelState[];
  charging: ChargingState | null;
  selectedIslandId: number;
  zone: PowerZone;
  zoneIslandId: number;
  feverProgress: number;
  feverFilled: boolean;
  feverActive: boolean;
  feverRemaining: number;
  owlText: string;
}

export interface ResultEvent {
  kind: ResultKind;
  parcel: ParcelState;
  selectedIslandId: number;
  power: number;
  scoreAwarded: number;
  zone: PowerZone;
}

export interface ReviewStats extends RunStats {
  name: string;
  grade: string;
}

export interface ReviewResult {
  title: string;
  review: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  grade: string;
  createdAt: number;
}
