import { LEADERBOARD } from '../config/gameConfig';
import type { LeaderboardEntry } from '../game/types';

export interface LeaderboardSaveResult {
  entries: LeaderboardEntry[];
  entry: LeaderboardEntry;
  newId: string;
}

const PRESET_ENTRIES: readonly LeaderboardEntry[] = [
  { id: 'preset-mochi', name: 'Mochi Express', score: 4200, grade: 'S', createdAt: Date.UTC(2026, 0, 5) },
  { id: 'preset-owl', name: 'Owl Actually', score: 3300, grade: 'A', createdAt: Date.UTC(2026, 0, 4) },
  { id: 'preset-paws', name: 'Captain Paws', score: 2600, grade: 'A', createdAt: Date.UTC(2026, 0, 3) },
  { id: 'preset-bean', name: 'Special Deli-fur-y', score: 1800, grade: 'B', createdAt: Date.UTC(2026, 0, 2) },
  { id: 'preset-cloud', name: 'Cloud Intern', score: 900, grade: 'C', createdAt: Date.UTC(2026, 0, 1) },
];

function presetEntries(): LeaderboardEntry[] {
  return PRESET_ENTRIES.map((entry) => ({ ...entry }));
}

function sorted(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((left, right) => right.score - left.score || right.createdAt - left.createdAt)
    .slice(0, LEADERBOARD.maxEntries);
}

function isEntry(value: unknown): value is LeaderboardEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === 'string'
    && typeof entry.name === 'string'
    && typeof entry.score === 'number'
    && Number.isFinite(entry.score)
    && typeof entry.grade === 'string'
    && typeof entry.createdAt === 'number'
    && Number.isFinite(entry.createdAt);
}

function readEntries(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return presetEntries();

  try {
    const raw = window.localStorage.getItem(LEADERBOARD.storageKey);
    if (raw === null) return presetEntries();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return presetEntries();
    return parsed.filter(isEntry).map((entry) => ({
      id: entry.id,
      name: entry.name,
      score: entry.score,
      grade: entry.grade,
      createdAt: entry.createdAt,
    }));
  } catch {
    return presetEntries();
  }
}

function writeEntries(entries: readonly LeaderboardEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LEADERBOARD.storageKey, JSON.stringify(entries));
  } catch {
    return;
  }
}

function createId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // A timestamp fallback also works in restricted browser contexts.
  }
  return `post-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getLeaderboard(): LeaderboardEntry[] {
  return sorted(readEntries());
}

export function saveScore(name: string, score: number, grade: string): LeaderboardSaveResult {
  const cleanName = name.trim().slice(0, 24) || 'Anonymous Cat';
  const cleanScore = Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0;
  const entry: LeaderboardEntry = {
    id: createId(),
    name: cleanName,
    score: cleanScore,
    grade: grade.trim().slice(0, 8) || 'C',
    createdAt: Date.now(),
  };
  const entries = sorted([...readEntries(), entry]);
  writeEntries(entries);
  return { entries, entry, newId: entry.id };
}
