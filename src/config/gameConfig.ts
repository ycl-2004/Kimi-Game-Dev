export const PALETTE = {
  paper: '#FFF6E9',
  sky: '#DDF1FF',
  red: '#FF6B4A',
  blue: '#4A90E2',
  yellow: '#FFD166',
  mint: '#4CC9A0',
  berry: '#FF8FB1',
  lavender: '#B39DDB',
  wood: '#E8B88A',
  ink: '#2B211E',
} as const;

export const FEATURES = {
  kimiReview: true,
  voice: true,
  manualFever: true,
  stage2: true,
  sunset: true,
};

export const ISLANDS = [
  { id: 0, name: 'Cake Isle', short: 'CAKE', color: PALETTE.mint, icon: 'cupcake', inputs: ['1'], baseDistance: 0.30, driftAmp: 0.18, driftPeriod: 7, driftPhase: 0, x: -9, stage2X: -12, elevation: 0 },
  { id: 1, name: 'Cat Harbor', short: 'HARBOR', color: PALETTE.yellow, icon: 'lighthouse', inputs: ['2'], baseDistance: 0.70, driftAmp: 0.18, driftPeriod: 9, driftPhase: 2.1, x: 0, stage2X: 0, elevation: 0 },
  { id: 2, name: 'Volcano Spa', short: 'SPA', color: PALETTE.red, icon: 'volcano', inputs: ['3'], baseDistance: 0.50, driftAmp: 0.18, driftPeriod: 8, driftPhase: 4.2, x: 9, stage2X: 12, elevation: 0 },
  { id: 3, name: 'Berry Farm', short: 'BERRY', color: PALETTE.berry, icon: 'berry', inputs: ['1', '2'], baseDistance: 0.45, driftAmp: 0.16, driftPeriod: 6.5, driftPhase: 1.1, x: -4.5, stage2X: -6, elevation: 0.65 },
  { id: 4, name: 'Star Observatory', short: 'STARS', color: PALETTE.lavender, icon: 'observatory', inputs: ['2', '3'], baseDistance: 0.60, driftAmp: 0.16, driftPeriod: 7.5, driftPhase: 3.3, x: 4.5, stage2X: 6, elevation: 0.85 },
] as const;

const DAY_STAGE = { id: 'day', start: 0, end: 30, islandIds: [0, 1, 2], driftScale: 1, allowChords: false } as const;
const SUNSET_STAGE = { id: 'sunset', start: 30, end: 60, islandIds: [0, 3, 1, 4, 2], driftScale: 1.3, allowChords: true } as const;

export const STAGES = FEATURES.stage2 ? [DAY_STAGE, SUNSET_STAGE] : [DAY_STAGE];
export const STAGE_TRANSITION_DURATION = 2;
export const CHORDS = {
  retargetWindowMs: 150,
  randomTargetChance: 0.4,
  hintDuration: 1.5,
  waitWindowBonus: 1.5,
} as const;

export const RUN_LENGTH = STAGES[STAGES.length - 1].end;

export const SPEED_STEPS = [
  { step: 1, start: 0, end: 15, beltSpeed: 1, waitWindow: 7, multiplier: 1, label: 'SPEED UP!', mix: { NORMAL: 1, FRAGILE: 0, EXPRESS: 0 } },
  { step: 2, start: 15, end: 30, beltSpeed: 1.15, waitWindow: 6, multiplier: 1.5, label: 'SPEED UP!', mix: { NORMAL: 0.5, FRAGILE: 0.3, EXPRESS: 0.2 } },
  { step: 3, start: 30, end: 45, beltSpeed: 1.35, waitWindow: 5, multiplier: 2, label: 'SPEED UP!', mix: { NORMAL: 0.35, FRAGILE: 0.35, EXPRESS: 0.3 } },
  { step: 4, start: 45, end: 60, beltSpeed: 1.55, waitWindow: 4.2, multiplier: 2.5, label: 'RUSH HOUR!', mix: { NORMAL: 0.2, FRAGILE: 0.4, EXPRESS: 0.4 } },
] as const;

export const PARCEL_TYPES = {
  NORMAL: { goodScore: 100, perfectScore: 150, greenHalfWidth: 0.17, goldHalfWidth: 0.065, needleSpeed: 0.75 },
  FRAGILE: { goodScore: 130, perfectScore: 200, greenHalfWidth: 0.11, goldHalfWidth: 0.035, needleSpeed: 0.75 },
  EXPRESS: { goodScore: 200, perfectScore: 250, greenHalfWidth: 0.17, goldHalfWidth: 0.065, needleSpeed: 1.2 },
} as const;

export const SCRIPTED_FIRSTS = [
  { at: 10, parcelType: 'FRAGILE', targetIslandIds: [] },
  { at: 20, parcelType: 'EXPRESS', targetIslandIds: [] },
  { at: 32, parcelType: 'NORMAL', targetIslandIds: [3, 4] },
] as const;

export const POWER = {
  baseSweepSpeed: 0.75,
  speedStepNeedleBonus: 0.08,
  nearZoneCenter: 0.26,
  farZoneCenter: 0.74,
};

export const FEVER = {
  deliveriesToFill: 4,
  duration: 8,
  goldHalfWidthBonus: 0.025,
  scoreMultiplier: 2,
};

export const BELT = {
  startX: -13.2,
  initialX: -2.8,
  launchX: 2.9,
  endX: 3.65,
  maxQueueSize: 3,
  parcelSpacing: 2.8,
  moveSpeed: 3.5,
  catchupThresholdX: -3.5,
  emptyCatchupMultiplier: 1.6,
  initialSpawnDelay: 0.75,
  spawnDelayMin: 1.35,
  spawnDelayMax: 2.45,
  emptySpawnDelay: 0.25,
} as const;

export const GAMEPLAY = {
  expressDuration: 5.5,
  flightDuration: 0.9,
  nearWorldDepth: -8,
  farWorldDepth: -22,
  attractAi: { perfectChance: 0.7, goodChance: 0.25, minHold: 0.25, maxHold: 2.8, releaseTolerance: 0.035 },
};

export const GRADES = [
  { grade: 'S+', minimum: 9000 },
  { grade: 'S', minimum: 7000 },
  { grade: 'A', minimum: 5000 },
  { grade: 'B', minimum: 3000 },
  { grade: 'C', minimum: 0 },
] as const;

export const OWL_LINES = {
  start: 'Shift starts! Hold and release!',
  perfect: 'PERFECT THROW!',
  miss: 'Oof! Watch the gold!',
  express: 'EXPRESS! Hurry!',
  chord: 'Two buttons at once!',
  feverReady: "Fever's ready! Tap it!",
  fever: 'FEVER TIME!!',
  speedup: 'Speed up!',
  rush: 'RUSH HOUR!',
  end: "Shift over! Let's see your receipt.",
} as const;

export const REVIEW = { timeoutMs: 2500 };
export const LEADERBOARD = { storageKey: 'cloud-post-local-v1', maxEntries: 10 };
export const ONBOARDING_LINE = "Hold the island's button. Release when the needle is in the gold!";
