import type {
  LevelDefinition,
  LevelId,
  TransitionDefinition,
  TutorialDefinition,
} from '../game/types';

export const PALETTE = {
  paper: '#FFF6E9',
  sky: '#DDF1FF',
  red: '#FF6B4A',
  blue: '#4A90E2',
  cobalt: '#5299EB',
  yellow: '#FFD166',
  mint: '#4CC9A0',
  meadow: '#9BC53D',
  berry: '#FF8FB1',
  lavender: '#9378D8',
  basalt: '#5C4E4B',
  aqua: '#7EE8E0',
  lava: '#FF9F1C',
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
  { id: 0, name: 'Cake Isle', short: 'CAKE', color: PALETTE.mint, icon: 'cupcake', inputs: ['1'], baseDistance: 0.30, driftAmp: 0.18, driftPeriod: 7, driftPhase: 0, x: -9, stage2X: -11.2, elevation: 0 },
  { id: 1, name: 'Cat Harbor', short: 'HARBOR', color: PALETTE.yellow, icon: 'lighthouse', inputs: ['2'], baseDistance: 0.70, driftAmp: 0.18, driftPeriod: 9, driftPhase: 2.1, x: 0, stage2X: 0, elevation: 0 },
  { id: 2, name: 'Volcano Spa', short: 'SPA', color: PALETTE.cobalt, icon: 'volcano', inputs: ['3'], baseDistance: 0.50, driftAmp: 0.18, driftPeriod: 8, driftPhase: 4.2, x: 9, stage2X: 11.2, elevation: 0 },
  { id: 3, name: 'Berry Farm', short: 'BERRY', color: PALETTE.red, icon: 'berry', inputs: ['1', '2'], baseDistance: 0.45, driftAmp: 0.16, driftPeriod: 6.5, driftPhase: 1.1, x: -4.5, stage2X: -5.6, elevation: 0.65 },
  { id: 4, name: 'Star Observatory', short: 'STARS', color: PALETTE.lavender, icon: 'observatory', inputs: ['2', '3'], baseDistance: 0.60, driftAmp: 0.16, driftPeriod: 7.5, driftPhase: 3.3, x: 4.5, stage2X: 5.6, elevation: 0.85 },
] as const;

export const TUTORIAL = {
  duration: 5,
  cards: [
    {
      image: `${import.meta.env.BASE_URL}tutorial/hold.svg`,
      title: 'HOLD TO CHARGE',
      description: 'Hold the button that matches the parcel’s island.',
    },
    {
      image: `${import.meta.env.BASE_URL}tutorial/gold-zone.svg`,
      title: 'WATCH THE GOLD',
      description: 'The moving gold zone shows the right throwing power.',
    },
    {
      image: `${import.meta.env.BASE_URL}tutorial/release.svg`,
      title: 'RELEASE TO DELIVER',
      description: 'Let go inside the gold for a perfect delivery.',
    },
  ],
} as const satisfies TutorialDefinition;

export const SPEED_TRANSITION = {
  kind: 'speed',
  duration: 4,
  title: 'SPEED UP!',
  description: 'The belt is picking up speed. Fragile and express parcels are joining the route.',
  nextLevelId: 'normal',
} as const satisfies TransitionDefinition;

export const CHORD_TRANSITION = {
  kind: 'chords',
  duration: 4,
  title: 'CHORD SHIFT!',
  description: 'Five islands ahead. Hold both buttons together for chord deliveries.',
  nextLevelId: 'sunset',
} as const satisfies TransitionDefinition;

export const LEVEL_DEFINITIONS: Record<LevelId, LevelDefinition> = {
  slow: {
    id: 'slow',
    name: 'Slow',
    sceneId: 'day',
    duration: 20,
    beltSpeed: 0.5,
    waitWindow: 7,
    multiplier: 1,
    needleStep: 1,
    islandIds: [0, 1, 2],
    driftScale: 1,
    allowChords: false,
    parcelMix: { NORMAL: 1, FRAGILE: 0, EXPRESS: 0 },
    scriptedFirsts: [],
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    sceneId: 'day',
    duration: 25,
    beltSpeed: 1,
    waitWindow: 6,
    multiplier: 1.5,
    needleStep: 2,
    islandIds: [0, 1, 2],
    driftScale: 1,
    allowChords: false,
    parcelMix: { NORMAL: 0.5, FRAGILE: 0.3, EXPRESS: 0.2 },
    scriptedFirsts: [
      { at: 8, parcelType: 'FRAGILE', targetIslandIds: [] },
      { at: 16, parcelType: 'EXPRESS', targetIslandIds: [] },
    ],
    transition: SPEED_TRANSITION,
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    sceneId: 'sunset',
    duration: 30,
    beltSpeed: 1.3,
    waitWindow: 5,
    multiplier: 2,
    needleStep: 3,
    islandIds: [0, 3, 1, 4, 2],
    driftScale: 1.3,
    allowChords: true,
    parcelMix: { NORMAL: 0.35, FRAGILE: 0.35, EXPRESS: 0.3 },
    scriptedFirsts: [
      { at: 0, parcelType: 'NORMAL', targetIslandIds: [3, 4] },
    ],
    transition: CHORD_TRANSITION,
    practiceTransition: CHORD_TRANSITION,
  },
};

export const FULL_RUN_LEVEL_IDS = ['slow', 'normal', 'sunset'] as const satisfies readonly LevelId[];

export const LEVELS: readonly LevelDefinition[] = FULL_RUN_LEVEL_IDS.map((levelId) => LEVEL_DEFINITIONS[levelId]);

export const TOTAL_SCORING_DURATION = FULL_RUN_LEVEL_IDS.reduce(
  (total, levelId) => total + LEVEL_DEFINITIONS[levelId].duration,
  0,
);

export const FULL_RUN_TOTAL_DURATION = TUTORIAL.duration + TOTAL_SCORING_DURATION + FULL_RUN_LEVEL_IDS.reduce(
  (total, levelId) => total + (LEVEL_DEFINITIONS[levelId].transition?.duration ?? 0),
  0,
);

export const CHORDS = {
  retargetWindowMs: 150,
  randomTargetChance: 0.4,
  hintDuration: 1.5,
  waitWindowBonus: 1.5,
} as const;

export const PARCEL_TYPES = {
  NORMAL: { goodScore: 100, perfectScore: 150, greenHalfWidth: 0.17, goldHalfWidth: 0.065, needleSpeed: 0.75 },
  FRAGILE: { goodScore: 130, perfectScore: 200, greenHalfWidth: 0.11, goldHalfWidth: 0.035, needleSpeed: 0.75 },
  EXPRESS: { goodScore: 200, perfectScore: 250, greenHalfWidth: 0.17, goldHalfWidth: 0.065, needleSpeed: 1.2 },
} as const;

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
export const ONBOARDING_LINE = 'Parcels roll in. Hold the matching island button, then release inside the moving gold zone!';
