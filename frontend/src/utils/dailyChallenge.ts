/**
 * Shared helpers for the Arcade and the Daily Challenges.
 *
 * Dates are derived from the visitor's *local* calendar day so a puzzle stays
 * stable across refreshes / re-renders and does not flip at an arbitrary UTC
 * boundary. Storage keys are intentionally kept identical to the original
 * implementation so existing progress is preserved.
 */

export type DailyGameId = "queens" | "tango" | "pinpoint" | "sudoku";

export const DAILY_GAME_IDS: DailyGameId[] = ["queens", "tango", "pinpoint", "sudoku"];

export const BEST_SCORE_KEYS = {
  snake: "arcade_snake_best",
  memory: "arcade_memory_best",
  spacedodge: "arcade_spacedodge_best",
} as const;

/** Local calendar day as `YYYY-MM-DD`. */
export function getDailyKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Human readable label for a `YYYY-MM-DD` key, without timezone drift. */
export function formatDailyKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Stable 32-bit string hash (FNV-1a). */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic PRNG (mulberry32) so a seed always yields the same puzzle. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle using a supplied PRNG. Mutates and returns `items`. */
export function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function dailyStorageKey(game: DailyGameId, day: string): string {
  return `arcade_daily_${game}_${day}`;
}

export function readDailyCompletion(game: DailyGameId, day: string): boolean {
  try {
    return localStorage.getItem(dailyStorageKey(game, day)) === "true";
  } catch {
    return false;
  }
}

export function writeDailyCompletion(game: DailyGameId, day: string): void {
  try {
    localStorage.setItem(dailyStorageKey(game, day), "true");
  } catch {
    // Storage can be unavailable (private mode); completion simply won't persist.
  }
}

export function readBestScore(key: string): number {
  try {
    return parseInt(localStorage.getItem(key) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function writeBestScore(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage failures.
  }
}

/** Seconds -> `m:ss`. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
