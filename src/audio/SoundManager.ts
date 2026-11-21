import { FEATURES } from '../config/gameConfig';

const SFX_FILES = [
  'charge_loop',
  'launch',
  'perfect',
  'good',
  'shatter',
  'miss',
  'drop',
  'fever',
  'speedup',
  'receipt',
  'bgm',
] as const;

const VOICE_FILES = [
  'start',
  'perfect',
  'miss',
  'express',
  'fever_ready',
  'fever',
  'speedup',
  'rush',
  'end',
] as const;

const availability = new Map<string, boolean>();
const activeMedia = new Set<HTMLAudioElement>();

let initialization: Promise<void> | null = null;
let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let enabled = true;
let speedStep = 1;
let chargePower = 0;
let chargeActive = false;
let chargeMedia: HTMLAudioElement | null = null;
let chargeOscillator: OscillatorNode | null = null;
let chargeGain: GainNode | null = null;
let bgmRequested = false;
let bgmMedia: HTMLAudioElement | null = null;
let bgmTimer: ReturnType<typeof setInterval> | null = null;

function normalizedName(name: string): string {
  return name.trim().replace(/\.mp3$/i, '');
}

function audioUrl(name: string): string {
  return `/audio/${encodeURIComponent(name)}.mp3`;
}

function voiceFile(name: string): string {
  const baseName = normalizedName(name)
    .replace(/^voice_/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
  return `voice_${baseName}`;
}

async function probeFile(name: string): Promise<void> {
  if (typeof fetch !== 'function') {
    availability.set(name, false);
    return;
  }

  try {
    const response = await fetch(audioUrl(name), { method: 'HEAD' });
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    const isAudio = contentType === ''
      || contentType.startsWith('audio/')
      || contentType.includes('application/octet-stream');
    availability.set(name, response.ok && isAudio);
  } catch {
    availability.set(name, false);
  }
}

export function initialize(): Promise<void> {
  if (initialization === null) {
    initialization = (async () => {
      const files: string[] = [...SFX_FILES];
      if (FEATURES.voice) {
        files.push(...VOICE_FILES.map((name) => `voice_${name}`));
      }
      await Promise.all(files.map((name) => probeFile(name)));
    })();
  }
  return initialization;
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (context !== null) return context;

  const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  const ContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;
  if (ContextConstructor === undefined) return null;

  try {
    context = new ContextConstructor();
    masterGain = context.createGain();
    masterGain.gain.value = enabled ? 1 : 0;
    masterGain.connect(context.destination);
    return context;
  } catch {
    context = null;
    masterGain = null;
    return null;
  }
}

function setMasterVolume(): void {
  if (context === null || masterGain === null) return;
  masterGain.gain.setTargetAtTime(enabled ? 1 : 0, context.currentTime, 0.015);
}

function releaseMedia(audio: HTMLAudioElement): void {
  audio.pause();
  activeMedia.delete(audio);
}

function createMedia(name: string, loop: boolean): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;

  const audio = new Audio(audioUrl(name));
  audio.preload = 'auto';
  audio.loop = loop;
  audio.volume = name === 'bgm' ? 0.45 : 0.8;
  activeMedia.add(audio);

  if (!loop) {
    audio.addEventListener('ended', () => activeMedia.delete(audio), { once: true });
    audio.addEventListener('error', () => activeMedia.delete(audio), { once: true });
  }

  const playback = audio.play();
  void playback.catch(() => {
    if (!loop) activeMedia.delete(audio);
  });
  return audio;
}

function playMedia(name: string): void {
  if (availability.get(name) === true) createMedia(name, false);
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  delay = 0,
  endFrequency = frequency,
): void {
  if (!enabled) return;
  const audioContext = ensureContext();
  if (audioContext === null || masterGain === null) return;

  const start = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.018, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function noise(duration: number, volume: number, frequency: number, delay = 0): void {
  if (!enabled) return;
  const audioContext = ensureContext();
  if (audioContext === null || masterGain === null) return;

  const frameCount = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.random() * 2 - 1;
  }

  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  const start = audioContext.currentTime + delay;
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = 0.7;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start(start);
}

function marimba(frequencies: readonly number[], spacing: number, volume: number): void {
  frequencies.forEach((frequency, index) => {
    tone(frequency, 0.24, 'sine', volume, index * spacing);
    tone(frequency * 2, 0.11, 'triangle', volume * 0.2, index * spacing);
  });
}

function synthesize(name: string): void {
  switch (name) {
    case 'launch':
      tone(240, 0.2, 'triangle', 0.16, 0, 760);
      noise(0.16, 0.08, 1350);
      break;
    case 'perfect':
      marimba([523.25, 659.25, 783.99, 1046.5], 0.065, 0.15);
      break;
    case 'good':
      marimba([392, 523.25, 659.25], 0.075, 0.12);
      break;
    case 'shatter':
      noise(0.3, 0.16, 3900);
      tone(1800, 0.24, 'sine', 0.08, 0, 620);
      tone(2400, 0.16, 'triangle', 0.05, 0.035, 1100);
      break;
    case 'miss':
      tone(190, 0.46, 'sine', 0.2, 0, 62);
      break;
    case 'drop':
      tone(230, 0.52, 'triangle', 0.17, 0, 48);
      noise(0.18, 0.05, 420, 0.18);
      break;
    case 'fever':
      marimba([523.25, 659.25, 783.99, 1046.5, 1318.51], 0.08, 0.14);
      tone(261.63, 0.7, 'sine', 0.08);
      break;
    case 'speedup':
      marimba([329.63, 440, 554.37, 659.25], 0.055, 0.12);
      break;
    case 'receipt':
      noise(0.28, 0.08, 2400);
      tone(96, 0.045, 'square', 0.04, 0.02);
      tone(96, 0.045, 'square', 0.04, 0.12);
      tone(96, 0.045, 'square', 0.04, 0.22);
      break;
    default:
      marimba([523.25, 659.25, 783.99], 0.06, 0.1);
      break;
  }
}

function stopChargeSynth(): void {
  const oscillator = chargeOscillator;
  chargeOscillator = null;
  chargeGain = null;
  if (oscillator === null) return;
  try {
    oscillator.stop();
  } catch {
    return;
  } finally {
    oscillator.disconnect();
  }
}

function startChargeSynth(): void {
  if (chargeOscillator !== null) return;
  const audioContext = ensureContext();
  if (audioContext === null || masterGain === null) return;

  chargeOscillator = audioContext.createOscillator();
  chargeGain = audioContext.createGain();
  chargeOscillator.type = 'sine';
  chargeOscillator.frequency.value = 150 + chargePower * 430;
  chargeGain.gain.value = 0.055;
  chargeOscillator.connect(chargeGain);
  chargeGain.connect(masterGain);
  chargeOscillator.start();
}

function stopBgmSynth(): void {
  if (bgmTimer !== null) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

function scheduleBgmPhrase(): void {
  if (!enabled || context === null || context.state !== 'running') return;
  const rate = 1 + (Math.max(1, speedStep) - 1) * 0.04;
  const beat = 0.31 / rate;
  const melody = [261.63, 329.63, 392, 440, 392, 329.63, 293.66, 329.63];
  marimba(melody, beat, 0.035);
  tone(130.81, beat * 3.4, 'sine', 0.025);
  tone(196, beat * 3.4, 'sine', 0.022, beat * 4);
}

function startBgmSynth(): void {
  if (bgmTimer !== null) return;
  ensureContext();
  scheduleBgmPhrase();
  const rate = 1 + (Math.max(1, speedStep) - 1) * 0.04;
  bgmTimer = setInterval(scheduleBgmPhrase, (0.31 * 8 * 1000) / rate);
}

export async function unlock(): Promise<void> {
  const audioContext = ensureContext();
  if (audioContext !== null && audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch {
      return;
    }
  }

  if (!enabled) return;
  if (bgmRequested) startBgm();
  if (chargeActive) startCharge();
}

export function setEnabled(value: boolean): void {
  if (enabled === value) return;
  enabled = value;
  setMasterVolume();

  if (!enabled) {
    for (const audio of activeMedia) audio.pause();
    stopChargeSynth();
    stopBgmSynth();
    return;
  }

  if (bgmRequested) startBgm();
  if (chargeActive) startCharge();
}

export function isEnabled(): boolean {
  return enabled;
}

export function play(name: string): void {
  if (!enabled) return;
  const file = normalizedName(name);
  if (!/^[a-zA-Z0-9_-]+$/.test(file)) return;
  if (file === 'bgm') {
    startBgm();
    return;
  }
  if (file === 'charge_loop') {
    startCharge();
    return;
  }
  if (availability.get(file) === true) playMedia(file);
  else synthesize(file);
}

export function playVoice(name: string): void {
  if (!enabled || !FEATURES.voice) return;
  const file = voiceFile(name);
  if (!/^voice_[a-zA-Z0-9_-]+$/.test(file)) return;
  playMedia(file);
}

export function startCharge(): void {
  chargeActive = true;
  if (!enabled) return;

  if (availability.get('charge_loop') === true) {
    stopChargeSynth();
    if (chargeMedia === null) chargeMedia = createMedia('charge_loop', true);
    else void chargeMedia.play().catch(() => undefined);
    if (chargeMedia !== null) chargeMedia.playbackRate = 0.85 + chargePower * 0.4;
    return;
  }
  startChargeSynth();
}

export function updateCharge(power: number): void {
  chargePower = Number.isFinite(power) ? Math.min(1, Math.max(0, power)) : 0;
  if (chargeMedia !== null) chargeMedia.playbackRate = 0.85 + chargePower * 0.4;
  if (context !== null && chargeOscillator !== null) {
    chargeOscillator.frequency.setTargetAtTime(150 + chargePower * 430, context.currentTime, 0.025);
  }
}

export function stopCharge(): void {
  chargeActive = false;
  if (chargeMedia !== null) {
    releaseMedia(chargeMedia);
    chargeMedia.currentTime = 0;
    chargeMedia = null;
  }
  stopChargeSynth();
}

export function setSpeedStep(step: number): void {
  speedStep = Number.isFinite(step) ? Math.max(1, step) : 1;
  const rate = 1 + (speedStep - 1) * 0.04;
  if (bgmMedia !== null) bgmMedia.playbackRate = rate;
  if (enabled && bgmRequested && bgmMedia === null) {
    stopBgmSynth();
    startBgmSynth();
  }
}

export function startBgm(): void {
  bgmRequested = true;
  if (!enabled) return;

  if (availability.get('bgm') === true) {
    stopBgmSynth();
    if (bgmMedia === null) bgmMedia = createMedia('bgm', true);
    else void bgmMedia.play().catch(() => undefined);
    if (bgmMedia !== null) bgmMedia.playbackRate = 1 + (speedStep - 1) * 0.04;
    return;
  }
  startBgmSynth();
}

export function stopBgm(): void {
  bgmRequested = false;
  if (bgmMedia !== null) {
    releaseMedia(bgmMedia);
    bgmMedia.currentTime = 0;
    bgmMedia = null;
  }
  stopBgmSynth();
}

export class SoundManager {
  constructor() {
    void initialize();
  }

  initialize(): Promise<void> {
    return initialize();
  }

  unlock(): Promise<void> {
    return unlock();
  }

  setEnabled(value: boolean): void {
    setEnabled(value);
  }

  setMuted(muted: boolean): void {
    setEnabled(!muted);
  }

  isEnabled(): boolean {
    return isEnabled();
  }

  play(name: string): void {
    play(name);
  }

  playVoice(name: string): void {
    playVoice(name);
  }

  startCharge(): void {
    startCharge();
  }

  updateCharge(power: number): void {
    updateCharge(power);
  }

  stopCharge(): void {
    stopCharge();
  }

  setSpeedStep(step: number): void {
    setSpeedStep(step);
  }

  startBgm(): void {
    startBgm();
  }

  stopBgm(): void {
    stopBgm();
  }
}
