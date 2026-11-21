import type { ISLANDS, PARCEL_TYPES } from '../config/gameConfig';

export type ParcelType = keyof typeof PARCEL_TYPES;
export type GameMode = 'title' | 'playing' | 'ended';
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
}

export type IslandId = (typeof ISLANDS)[number]['id'];

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

export interface GameSnapshot {
  mode: GameMode;
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
