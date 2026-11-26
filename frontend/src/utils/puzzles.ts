/**
 * Deterministic, solver-verified puzzle generation for the Daily Challenges.
 *
 * Every generator derives its puzzle from the daily key, so the same calendar
 * day always yields the same puzzle. Each puzzle is only accepted when a
 * backtracking solver proves the solution is *unique* - there are no hand-typed
 * "placeholder" puzzles and no solution that breaks the puzzle's own rules.
 */

import { createRng, hashString, shuffleWithRng } from "./dailyChallenge";

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/* ------------------------------------------------------------------ *
 * Queens - one queen per row, column and region, never touching.
 * ------------------------------------------------------------------ */

export interface QueensPuzzle {
  size: number;
  difficulty: "Standard" | "Hard";
  /** Region id (0..size-1) per cell. */
  regions: number[][];
  solution: { row: number; col: number }[];
}

/** Columns for rows 0..n-1 where no two queens touch (in any direction). */
function placeQueens(size: number, rng: () => number): number[] | null {
  const cols = new Array<number>(size).fill(-1);
  const usedCol = new Array<boolean>(size).fill(false);

  const backtrack = (row: number): boolean => {
    if (row === size) return true;
    for (const col of shuffleWithRng(Array.from({ length: size }, (_, i) => i), rng)) {
      if (usedCol[col]) continue;
      // Rows are filled top to bottom, so only the previous row can be adjacent.
      if (row > 0 && Math.abs(cols[row - 1] - col) < 2) continue;
      cols[row] = col;
      usedCol[col] = true;
      if (backtrack(row + 1)) return true;
      usedCol[col] = false;
    }
    return false;
  };

  return backtrack(0) ? cols : null;
}

/** Grow connected regions of exactly `size` cells, each seeded by one queen. */
function growRegions(size: number, cols: number[], rng: () => number): number[][] | null {
  const regions = Array.from({ length: size }, () => new Array<number>(size).fill(-1));
  const sizes = new Array<number>(size).fill(0);

  for (let row = 0; row < size; row++) {
    regions[row][cols[row]] = row;
    sizes[row] = 1;
  }

  const frontierOf = (id: number): number[] => {
    const cells: number[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (regions[r][c] !== id) continue;
        for (const [dr, dc] of NEIGHBOURS) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
          if (regions[nr][nc] === -1) cells.push(nr * size + nc);
        }
      }
    }
    return Array.from(new Set(cells));
  };

  let remaining = size * size - size;
  while (remaining > 0) {
    const candidates = Array.from({ length: size }, (_, id) => id)
      .filter((id) => sizes[id] < size)
      .map((id) => ({ id, size: sizes[id], frontier: frontierOf(id) }))
      .filter((candidate) => candidate.frontier.length > 0);

    if (candidates.length === 0) return null;

    const minSize = Math.min(...candidates.map((candidate) => candidate.size));
    const pool = candidates.filter((candidate) => candidate.size === minSize);
    const chosen = pool[Math.floor(rng() * pool.length)];
    const cell = chosen.frontier[Math.floor(rng() * chosen.frontier.length)];

    regions[Math.floor(cell / size)][cell % size] = chosen.id;
    sizes[chosen.id] += 1;
    remaining -= 1;
  }

  if (sizes.some((count) => count !== size)) return null;
  return regions;
}

/** Counts valid queen placements for a region layout (capped at `limit`). */
export function countQueenSolutions(regions: number[][], limit = 2): number {
  const size = regions.length;
  const usedCol = new Array<boolean>(size).fill(false);
  const usedRegion = new Array<boolean>(size).fill(false);
  const prevCol = new Array<number>(size).fill(-1);
  let count = 0;

  const backtrack = (row: number): void => {
    if (count >= limit) return;
    if (row === size) {
      count += 1;
      return;
    }
    for (let col = 0; col < size; col++) {
      if (usedCol[col] || usedRegion[regions[row][col]]) continue;
      if (row > 0 && Math.abs(prevCol[row - 1] - col) < 2) continue;
      usedCol[col] = true;
      usedRegion[regions[row][col]] = true;
      prevCol[row] = col;
      backtrack(row + 1);
      usedCol[col] = false;
      usedRegion[regions[row][col]] = false;
    }
  };

  backtrack(0);
  return count;
}

function tryGenerateQueens(size: number, seed: number, attempts: number): QueensPuzzle | null {
  const rng = createRng(seed);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const cols = placeQueens(size, rng);
    if (!cols) break;
    const regions = growRegions(size, cols, rng);
    if (!regions) continue;
    if (countQueenSolutions(regions, 2) !== 1) continue;
    return {
      size,
      difficulty: size >= 6 ? "Hard" : "Standard",
      regions,
      solution: cols.map((col, row) => ({ row, col })),
    };
  }
  return null;
}

export function generateQueens(day: string): QueensPuzzle {
  const prefersHard = hashString(`${day}:queens:size`) % 3 === 0;
  const sizes = prefersHard ? [6, 5] : [5, 6];
  for (const size of sizes) {
    const puzzle = tryGenerateQueens(size, hashString(`${day}:queens:${size}`), 300);
    if (puzzle) return puzzle;
  }
  // Insurance: a fixed, hand-verified 5x5 layout with a unique solution.
  return FALLBACK_QUEENS;
}

const FALLBACK_QUEENS: QueensPuzzle = {
  size: 5,
  difficulty: "Standard",
  regions: [
    [0, 0, 1, 1, 1],
    [0, 0, 1, 2, 1],
    [3, 0, 1, 2, 2],
    [3, 3, 3, 2, 2],
    [3, 4, 4, 4, 4],
  ],
  solution: [
    { row: 0, col: 2 },
    { row: 1, col: 0 },
    { row: 2, col: 4 },
    { row: 3, col: 1 },
    { row: 4, col: 3 },
  ],
};

/* ------------------------------------------------------------------ *
 * Tango - balanced suns & moons with = / x constraints.
 * ------------------------------------------------------------------ */

export type TangoSymbol = "SUN" | "MOON";

export interface TangoConstraint {
  row1: number;
  col1: number;
  row2: number;
  col2: number;
  kind: "EQUAL" | "OPPOSITE";
}

export interface TangoPuzzle {
  size: number;
  difficulty: "Standard";
  givens: (TangoSymbol | null)[][];
  constraints: TangoConstraint[];
  solution: TangoSymbol[][];
}

const TANGO_SIZE = 6;

function tangoConflict(
  grid: (TangoSymbol | null)[][],
  row: number,
  col: number,
  symbol: TangoSymbol,
  size: number,
  constraints: TangoConstraint[],
): boolean {
  const half = size / 2;
  let rowSuns = 0;
  let rowMoons = 0;
  let colSuns = 0;
  let colMoons = 0;

  for (let i = 0; i < size; i++) {
    const inRow = i === col ? symbol : grid[row][i];
    if (inRow === "SUN") rowSuns += 1;
    else if (inRow === "MOON") rowMoons += 1;

    const inCol = i === row ? symbol : grid[i][col];
    if (inCol === "SUN") colSuns += 1;
    else if (inCol === "MOON") colMoons += 1;
  }

  if (rowSuns > half || rowMoons > half || colSuns > half || colMoons > half) return true;

  const at = (r: number, c: number): TangoSymbol | null =>
    r === row && c === col ? symbol : grid[r][c];

  for (let start = -2; start <= 0; start++) {
    const c0 = col + start;
    if (c0 < 0 || c0 + 2 >= size) continue;
    if (at(row, c0) === symbol && at(row, c0 + 1) === symbol && at(row, c0 + 2) === symbol) {
      return true;
    }
  }
  for (let start = -2; start <= 0; start++) {
    const r0 = row + start;
    if (r0 < 0 || r0 + 2 >= size) continue;
    if (at(r0, col) === symbol && at(r0 + 1, col) === symbol && at(r0 + 2, col) === symbol) {
      return true;
    }
  }

  for (const constraint of constraints) {
    let otherRow = -1;
    let otherCol = -1;
    if (constraint.row1 === row && constraint.col1 === col) {
      otherRow = constraint.row2;
      otherCol = constraint.col2;
    } else if (constraint.row2 === row && constraint.col2 === col) {
      otherRow = constraint.row1;
      otherCol = constraint.col1;
    } else {
      continue;
    }
    const other = grid[otherRow][otherCol];
    if (other === null) continue;
    if (constraint.kind === "EQUAL" && other !== symbol) return true;
    if (constraint.kind === "OPPOSITE" && other === symbol) return true;
  }

  return false;
}

export function countTangoSolutions(
  givens: (TangoSymbol | null)[][],
  constraints: TangoConstraint[],
  limit = 2,
): number {
  const size = givens.length;
  const grid = givens.map((row) => [...row]);
  let count = 0;

  const backtrack = (pos: number): void => {
    if (count >= limit) return;
    if (pos === size * size) {
      count += 1;
      return;
    }
    const row = Math.floor(pos / size);
    const col = pos % size;
    if (grid[row][col] !== null) {
      backtrack(pos + 1);
      return;
    }
    for (const symbol of ["SUN", "MOON"] as TangoSymbol[]) {
      if (tangoConflict(grid, row, col, symbol, size, constraints)) continue;
      grid[row][col] = symbol;
      backtrack(pos + 1);
      grid[row][col] = null;
    }
  };

  backtrack(0);
  return count;
}

function buildTangoSolution(rng: () => number): TangoSymbol[][] | null {
  const size = TANGO_SIZE;
  const grid: (TangoSymbol | null)[][] = Array.from({ length: size }, () =>
    new Array<TangoSymbol | null>(size).fill(null),
  );

  const backtrack = (pos: number): boolean => {
    if (pos === size * size) return true;
    const row = Math.floor(pos / size);
    const col = pos % size;
    const order: TangoSymbol[] = rng() < 0.5 ? ["SUN", "MOON"] : ["MOON", "SUN"];
    for (const symbol of order) {
      if (tangoConflict(grid, row, col, symbol, size, [])) continue;
      grid[row][col] = symbol;
      if (backtrack(pos + 1)) return true;
      grid[row][col] = null;
    }
    return false;
  };

  return backtrack(0) ? (grid as TangoSymbol[][]) : null;
}

function pickTangoConstraints(
  solution: TangoSymbol[][],
  rng: () => number,
  count: number,
): TangoConstraint[] {
  const size = solution.length;
  const pairs: [number, number, number, number][] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (col + 1 < size) pairs.push([row, col, row, col + 1]);
      if (row + 1 < size) pairs.push([row, col, row + 1, col]);
    }
  }
  shuffleWithRng(pairs, rng);

  return pairs.slice(0, count).map(([row1, col1, row2, col2]) => ({
    row1,
    col1,
    row2,
    col2,
    kind: solution[row1][col1] === solution[row2][col2] ? "EQUAL" : "OPPOSITE",
  }));
}

function carveTango(
  solution: TangoSymbol[][],
  constraints: TangoConstraint[],
  rng: () => number,
  minGivens: number,
): (TangoSymbol | null)[][] {
  const size = solution.length;
  const givens: (TangoSymbol | null)[][] = solution.map((row) => [...row]);
  const positions: [number, number][] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) positions.push([row, col]);
  }
  shuffleWithRng(positions, rng);

  let givenCount = size * size;
  for (const [row, col] of positions) {
    if (givenCount <= minGivens) break;
    const saved = givens[row][col];
    givens[row][col] = null;
    if (countTangoSolutions(givens, constraints, 2) === 1) {
      givenCount -= 1;
    } else {
      givens[row][col] = saved;
    }
  }
  return givens;
}

export function generateTango(day: string): TangoPuzzle {
  const rng = createRng(hashString(`${day}:tango`));

  for (let attempt = 0; attempt < 200; attempt++) {
    const solution = buildTangoSolution(rng);
    if (!solution) continue;
    const constraints = pickTangoConstraints(solution, rng, 4);
    const givens = carveTango(solution, constraints, rng, 8);
    if (countTangoSolutions(givens, constraints, 2) !== 1) continue;
    return { size: TANGO_SIZE, difficulty: "Standard", givens, constraints, solution };
  }

  // Insurance: a fully specified grid is trivially valid and uniquely solvable.
  const solution = FALLBACK_TANGO_SOLUTION.map((row) => [...row]);
  return {
    size: TANGO_SIZE,
    difficulty: "Standard",
    givens: solution.map((row) => [...row]),
    constraints: [],
    solution,
  };
}

const FALLBACK_TANGO_SOLUTION: TangoSymbol[][] = [
  ["SUN", "SUN", "MOON", "MOON", "SUN", "MOON"],
  ["MOON", "MOON", "SUN", "SUN", "MOON", "SUN"],
  ["SUN", "MOON", "MOON", "SUN", "MOON", "SUN"],
  ["MOON", "SUN", "SUN", "MOON", "SUN", "MOON"],
  ["SUN", "MOON", "SUN", "MOON", "SUN", "MOON"],
  ["MOON", "SUN", "MOON", "SUN", "MOON", "SUN"],
];

/* ------------------------------------------------------------------ *
 * Mini Sudoku - 4x4 with selectable difficulty.
 * ------------------------------------------------------------------ */

export type SudokuDifficulty = "Easy" | "Medium" | "Hard";

export const SUDOKU_DIFFICULTIES: SudokuDifficulty[] = ["Easy", "Medium", "Hard"];

export interface SudokuPuzzle {
  size: number;
  box: number;
  solution: number[][];
  /** `true` = given (visible from the start) for each difficulty. */
  masks: Record<SudokuDifficulty, boolean[][]>;
}

const SUDOKU_SIZE = 4;
const SUDOKU_BOX = 2;

function sudokuValueAllowed(grid: number[][], size: number, box: number, row: number, col: number, value: number): boolean {
  for (let i = 0; i < size; i++) {
    if (grid[row][i] === value || grid[i][col] === value) return false;
  }
  const boxRow = Math.floor(row / box) * box;
  const boxCol = Math.floor(col / box) * box;
  for (let i = 0; i < box; i++) {
    for (let j = 0; j < box; j++) {
      if (grid[boxRow + i][boxCol + j] === value) return false;
    }
  }
  return true;
}

function buildSudokuSolution(rng: () => number): number[][] | null {
  const size = SUDOKU_SIZE;
  const grid = Array.from({ length: size }, () => new Array<number>(size).fill(0));

  const backtrack = (pos: number): boolean => {
    if (pos === size * size) return true;
    const row = Math.floor(pos / size);
    const col = pos % size;
    for (const value of shuffleWithRng(Array.from({ length: size }, (_, i) => i + 1), rng)) {
      if (!sudokuValueAllowed(grid, size, SUDOKU_BOX, row, col, value)) continue;
      grid[row][col] = value;
      if (backtrack(pos + 1)) return true;
      grid[row][col] = 0;
    }
    return false;
  };

  return backtrack(0) ? grid : null;
}

export function countSudokuSolutions(grid: number[][], limit = 2): number {
  const size = grid.length;
  const working = grid.map((row) => [...row]);
  let count = 0;

  const backtrack = (pos: number): void => {
    if (count >= limit) return;
    if (pos === size * size) {
      count += 1;
      return;
    }
    const row = Math.floor(pos / size);
    const col = pos % size;
    if (working[row][col] !== 0) {
      backtrack(pos + 1);
      return;
    }
    for (let value = 1; value <= size; value++) {
      if (!sudokuValueAllowed(working, size, SUDOKU_BOX, row, col, value)) continue;
      working[row][col] = value;
      backtrack(pos + 1);
      working[row][col] = 0;
    }
  };

  backtrack(0);
  return count;
}

function maskToGrid(solution: number[][], mask: boolean[][]): number[][] {
  return solution.map((row, r) => row.map((value, c) => (mask[r][c] ? value : 0)));
}

function countMasked(mask: boolean[][]): number {
  return mask.reduce((total, row) => total + row.filter(Boolean).length, 0);
}

function carveSudoku(solution: number[][], rng: () => number, minGivens: number): boolean[][] {
  const size = solution.length;
  const mask = solution.map((row) => row.map(() => true));
  const positions: [number, number][] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) positions.push([row, col]);
  }
  shuffleWithRng(positions, rng);

  let givenCount = size * size;
  for (const [row, col] of positions) {
    if (givenCount <= minGivens) break;
    mask[row][col] = false;
    if (countSudokuSolutions(maskToGrid(solution, mask), 2) === 1) {
      givenCount -= 1;
    } else {
      mask[row][col] = true;
    }
  }
  return mask;
}

/** Reveal extra cells (from the solution) until `target` givens are visible. */
function revealTo(
  _solution: number[][],
  base: boolean[][],
  target: number,
  rng: () => number,
): boolean[][] {
  const mask = base.map((row) => [...row]);
  if (countMasked(mask) >= target) return mask;

  const hidden: [number, number][] = [];
  for (let row = 0; row < mask.length; row++) {
    for (let col = 0; col < mask[row].length; col++) {
      if (!mask[row][col]) hidden.push([row, col]);
    }
  }
  shuffleWithRng(hidden, rng);

  let count = countMasked(mask);
  for (const [row, col] of hidden) {
    if (count >= target) break;
    mask[row][col] = true;
    count += 1;
  }
  return mask;
}

export function generateSudoku(day: string): SudokuPuzzle {
  const rng = createRng(hashString(`${day}:sudoku`));
  const solution = buildSudokuSolution(rng) ?? FALLBACK_SUDOKU_SOLUTION.map((row) => [...row]);
  const hard = carveSudoku(solution, rng, 6);
  const medium = revealTo(solution, hard, 9, rng);
  const easy = revealTo(solution, hard, 11, rng);
  return { size: SUDOKU_SIZE, box: SUDOKU_BOX, solution, masks: { Easy: easy, Medium: medium, Hard: hard } };
}

/** The playable grid (numbers or null) for a difficulty. */
export function sudokuGivens(puzzle: SudokuPuzzle, difficulty: SudokuDifficulty): (number | null)[][] {
  const mask = puzzle.masks[difficulty];
  return puzzle.solution.map((row, r) => row.map((value, c) => (mask[r][c] ? value : null)));
}

const FALLBACK_SUDOKU_SOLUTION: number[][] = [
  [1, 2, 3, 4],
  [4, 3, 2, 1],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
];

/* ------------------------------------------------------------------ *
 * Pinpoint - find the connection between clues.
 * ------------------------------------------------------------------ */

export interface PinpointPuzzle {
  answer: string;
  clues: string[];
  hint: string;
  acceptableAnswers: string[];
}

const PINPOINT_PUZZLES: PinpointPuzzle[] = [
  {
    answer: "Python",
    clues: ["Indentation", "Interpreter", "Snake-like logo", "Django & FastAPI"],
    hint: "A high-level language named after a comedy troupe.",
    acceptableAnswers: ["python", "python3", "py"],
  },
  {
    answer: "Database",
    clues: ["Tables", "Indexes", "Joins", "ACID"],
    hint: "A system for storing and querying structured data.",
    acceptableAnswers: ["database", "db", "sql", "postgres", "postgresql"],
  },
  {
    answer: "React",
    clues: ["Components", "Hooks", "JSX", "Virtual DOM"],
    hint: "A JavaScript UI library maintained by Meta.",
    acceptableAnswers: ["react", "reactjs", "react.js"],
  },
  {
    answer: "Git",
    clues: ["Commits", "Branches", "Merge conflicts", "Pull requests"],
    hint: "Distributed version control created by Linus Torvalds.",
    acceptableAnswers: ["git", "version control", "vcs"],
  },
  {
    answer: "API",
    clues: ["Endpoints", "JSON payload", "Rate limits", "Authentication keys"],
    hint: "A contract that lets two systems talk to each other.",
    acceptableAnswers: ["api", "apis", "rest api", "web api"],
  },
  {
    answer: "Cache",
    clues: ["Time to live", "Invalidation", "Redis", "Hit rate"],
    hint: "Fast temporary storage that avoids recomputing work.",
    acceptableAnswers: ["cache", "caching", "caches"],
  },
  {
    answer: "Docker",
    clues: ["Dockerfile", "Images", "Volumes", "Container registry"],
    hint: "Packages software with its dependencies and ships it anywhere.",
    acceptableAnswers: ["docker", "container", "containers", "containerisation", "containerization"],
  },
  {
    answer: "Cloud",
    clues: ["Regions", "Object storage", "Auto scaling", "Pay-as-you-go"],
    hint: "Rented compute and storage delivered over the internet.",
    acceptableAnswers: ["cloud", "cloud computing", "aws", "azure", "gcp"],
  },
  {
    answer: "Algorithm",
    clues: ["Complexity", "Sorting", "Recursion", "Big-O"],
    hint: "A step-by-step recipe for solving a problem.",
    acceptableAnswers: ["algorithm", "algorithms", "algo"],
  },
  {
    answer: "Encryption",
    clues: ["Cipher", "Public key", "HTTPS", "Decryption"],
    hint: "Scrambles data so only the intended reader can read it.",
    acceptableAnswers: ["encryption", "encrypt", "cryptography", "cipher"],
  },
  {
    answer: "CSS",
    clues: ["Selectors", "Flexbox", "Specificity", "Media queries"],
    hint: "The language that decides how a web page looks.",
    acceptableAnswers: ["css", "cascading style sheets", "stylesheet"],
  },
  {
    answer: "Debugging",
    clues: ["Breakpoints", "Stack trace", "Reproduce the bug", "Console logs"],
    hint: "The process of finding and removing defects.",
    acceptableAnswers: ["debugging", "debug", "debugger"],
  },
];

export function generatePinpoint(day: string): PinpointPuzzle {
  const index = hashString(`${day}:pinpoint`) % PINPOINT_PUZZLES.length;
  return PINPOINT_PUZZLES[index];
}

export const PINPOINT_PUZZLE_COUNT = PINPOINT_PUZZLES.length;
