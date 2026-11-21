import './styles.css';
import { SoundManager } from './audio/SoundManager';
import { GameEngine } from './game/GameEngine';
import { InputController } from './game/InputController';
import type { LevelId, ResultEvent } from './game/types';
import { DioramaScene } from './scene/DioramaScene';
import { FlowTransition } from './ui/FlowTransition';
import { Hud } from './ui/Hud';
import { Leaderboard } from './ui/Leaderboard';
import { Receipt } from './ui/Receipt';
import { TitleScreen } from './ui/TitleScreen';
import { Tutorial } from './ui/Tutorial';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) throw new Error('Missing #app root');
const app: HTMLDivElement = appRoot;

app.replaceChildren();
Object.assign(app.style, {
  position: 'fixed',
  inset: '0',
  overflow: 'hidden',
});

const sceneContainer = document.createElement('div');
sceneContainer.id = 'scene';
sceneContainer.className = 'scene-container';

const labelLayer = document.createElement('div');
labelLayer.id = 'labels';
labelLayer.className = 'labels-layer';
Object.assign(labelLayer.style, {
  position: 'absolute',
  inset: '0',
  pointerEvents: 'none',
});

sceneContainer.append(labelLayer);
app.append(sceneContainer);

const scene = new DioramaScene(sceneContainer, labelLayer);
const engine = new GameEngine((id) => scene.getIslandDistance(id));
const sound = new SoundManager();
const title = new TitleScreen();
const hud = new Hud();
const receipt = new Receipt();
const leaderboard = new Leaderboard();
const tutorial = new Tutorial();
const flowTransition = new FlowTransition();

app.append(title.element, hud.element, receipt.element, leaderboard.element, tutorial.element, flowTransition.element);

let muted = false;
let leaderboardOpen = false;
let wasCharging = false;
let wasFeverActive = false;

function syncSoundButtons(): void {
  title.setMuted(muted);
  hud.setMuted(muted);
}

function prepareRun(): void {
  app.classList.add('is-playing');
  requestAnimationFrame(() => scene.resize());
  void sound.unlock();
  leaderboardOpen = false;
  leaderboard.hide();
  title.hide();
  receipt.hide();
  tutorial.hide();
  flowTransition.hide();
  hud.hide();
  wasCharging = false;
  wasFeverActive = false;
  sound.stopCharge();
  sound.setSpeedStep(1);
  input.reset();
  sound.startBgm();
  sound.playVoice('start');
}

function startRun(): void {
  const mode = engine.getSnapshot().mode;
  if (mode !== 'title' && mode !== 'ended') return;
  prepareRun();
  engine.start();
}

function replayFullRun(): void {
  if (engine.getSnapshot().mode !== 'ended') return;
  prepareRun();
  engine.startFullRun();
}

function startPractice(levelId: LevelId): void {
  if (engine.getSnapshot().mode !== 'ended') return;
  prepareRun();
  engine.startPractice(levelId);
}

function returnToTitle(): void {
  app.classList.remove('is-playing');
  input.reset();
  sound.stopCharge();
  sound.stopBgm();
  wasCharging = false;
  wasFeverActive = false;
  tutorial.hide();
  flowTransition.hide();
  hud.hide();
  receipt.hide();
  leaderboardOpen = false;
  leaderboard.hide();
  engine.returnToTitle();
  title.show();
  requestAnimationFrame(() => scene.resize());
}

function confirm(): void {
  if (leaderboardOpen || document.activeElement instanceof HTMLInputElement) return;
  const mode = engine.getSnapshot().mode;
  if (mode === 'title' || mode === 'ended') startRun();
}

function activateFever(): void {
  if (engine.getSnapshot().mode === 'playing') engine.activateFever();
}

function showLeaderboard(): void {
  leaderboardOpen = true;
  leaderboard.show();
}

function hideLeaderboard(): void {
  leaderboardOpen = false;
  leaderboard.hide();
}

function toggleSound(): void {
  muted = !muted;
  sound.setMuted(muted);
  syncSoundButtons();
  if (!muted) void sound.unlock();
}

title.onStart = startRun;
title.onToggleSound = toggleSound;
title.onLeaderboard = showLeaderboard;
hud.onFever = activateFever;
hud.onToggleSound = toggleSound;
receipt.onPlayAgain = replayFullRun;
receipt.onSelectLevel = startPractice;
receipt.onEndShift = returnToTitle;
tutorial.onNext = () => engine.nextTutorialStep();
tutorial.onPrev = () => engine.prevTutorialStep();
tutorial.onSkip = () => engine.skipTutorial();
flowTransition.onReady = () => {
  void sound.unlock();
  engine.confirmTransition();
};
leaderboard.onClose = hideLeaderboard;

const input = new InputController({
  onPress: (islandId) => {
    if (engine.getSnapshot().mode === 'playing') engine.pressIsland(islandId);
  },
  onRetarget: (islandId) => {
    if (engine.getSnapshot().mode === 'playing') engine.retargetIsland(islandId);
  },
  onRelease: (islandId) => {
    if (engine.getSnapshot().mode === 'playing') engine.releaseIsland(islandId);
  },
  onFever: activateFever,
  onConfirm: confirm,
  allowChords: () => {
    const snapshot = engine.getSnapshot();
    return snapshot.mode === 'playing' && snapshot.allowChords && snapshot.stageTransition === null;
  },
});

app.querySelectorAll<HTMLElement>('[data-input]').forEach((button) => {
  const key = button.dataset.input;
  if (!key) return;
  button.style.touchAction = 'none';
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  input.bindHoldButton(button, key);
});

app.querySelectorAll<HTMLElement>('[data-chord]').forEach((button) => {
  const keys = button.dataset.chord?.split(',').filter(Boolean);
  if (keys?.length === 2) input.bindChordButton(button, keys);
});

function soundForResult(result: ResultEvent): string {
  if (result.kind === 'PERFECT') return 'perfect';
  if (result.kind === 'GOOD') return 'good';
  if (result.kind === 'DROPPED') return 'drop';
  if (result.kind === 'TOO STRONG' && result.parcel.type === 'FRAGILE') return 'shatter';
  return 'miss';
}

engine.onResult = (result) => {
  scene.handleResult(result);
  if (engine.getSnapshot().mode !== 'playing') return;

  hud.showResult(result);
  if (result.kind !== 'DROPPED' && result.kind !== 'EXPIRED') sound.play('launch');
  sound.play(soundForResult(result));
  if (result.kind === 'PERFECT') sound.playVoice('perfect');
  if (result.kind !== 'PERFECT' && result.kind !== 'GOOD') sound.playVoice('miss');
};

engine.onTutorialStart = () => {
  hud.hide();
  flowTransition.hide();
  tutorial.show();
};

engine.onLevelStart = (level) => {
  input.reset();
  sound.stopCharge();
  wasCharging = false;
  tutorial.hide();
  flowTransition.hide();
  hud.show();
  hud.showLevelBanner(level);
  scene.handleStepUp(level.needleStep);
  sound.setSpeedStep(level.needleStep);
};

engine.onTransitionStart = (transition) => {
  tutorial.hide();
  flowTransition.show(transition);
  sound.play('speedup');
  sound.playVoice(transition.kind === 'chords' ? 'chord_hint' : 'speedup');
};

engine.onStageTransitionStart = () => {
  input.reset();
  sound.stopCharge();
  wasCharging = false;
};

engine.onExpress = () => {
  if (engine.getSnapshot().mode === 'playing') sound.playVoice('express');
};

engine.onChordHint = (parcel) => {
  if (engine.getSnapshot().mode !== 'playing') return;
  hud.showChordHint(parcel);
  sound.playVoice('voice_chord_hint');
};

engine.onFeverReady = () => {
  if (engine.getSnapshot().mode === 'playing') sound.playVoice('feverReady');
};

engine.onEnd = (result) => {
  app.classList.remove('is-playing');
  requestAnimationFrame(() => scene.resize());
  input.reset();
  sound.stopCharge();
  sound.stopBgm();
  wasCharging = false;
  wasFeverActive = false;
  tutorial.hide();
  flowTransition.hide();
  hud.hide();
  title.hide();
  receipt.show(result);
  sound.play('receipt');
  sound.playVoice('end');
};

function releaseInputs(): void {
  sound.stopCharge();
  wasCharging = false;
}

window.addEventListener('blur', releaseInputs);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) releaseInputs();
});

window.addEventListener('resize', () => scene.resize());

title.show();
hud.hide();
tutorial.hide();
flowTransition.hide();
receipt.hide();
leaderboard.hide();
syncSoundButtons();
scene.resize();

let previousTime = performance.now();

function frame(now: number): void {
  const dt = Math.min(1, Math.max(0, (now - previousTime) / 1000));
  previousTime = now;

  scene.setTimeline(engine.timeline + dt);
  engine.update(dt);
  const snapshot = engine.getSnapshot();
  scene.update(dt, snapshot);
  hud.update(snapshot);
  tutorial.update(snapshot);

  const charging = snapshot.mode === 'playing' && snapshot.charging !== null;
  if (charging && !wasCharging) sound.startCharge();
  if (!charging && wasCharging) sound.stopCharge();
  if (snapshot.charging) sound.updateCharge(snapshot.charging.power);
  wasCharging = charging;

  if (snapshot.mode === 'playing' && snapshot.feverActive && !wasFeverActive) {
    sound.play('fever');
    sound.playVoice('fever');
  }
  wasFeverActive = snapshot.mode === 'playing' && snapshot.feverActive;

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
