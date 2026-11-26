import { CheckCircle2, Crown, HelpCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonStyles } from "@/components/ui/button";

// 5x5 Daily Queens Puzzles
interface QueensPuzzle {
  id: number;
  regions: number[][]; // 5x5 grid of region IDs (0-4)
  solution: [number, number][]; // 5 queen coordinates [row, col]
}

const QUEENS_PUZZLES: QueensPuzzle[] = [
  {
    id: 1,
    regions: [
      [0, 0, 1, 1, 1],
      [0, 0, 1, 2, 1],
      [3, 0, 1, 2, 2],
      [3, 3, 3, 2, 2],
      [3, 4, 4, 4, 4],
    ],
    solution: [
      [0, 2],
      [1, 0],
      [2, 4],
      [3, 1],
      [4, 3],
    ],
  },
  {
    id: 2,
    regions: [
      [0, 0, 0, 1, 1],
      [2, 0, 1, 1, 1],
      [2, 2, 3, 3, 1],
      [2, 4, 4, 3, 3],
      [4, 4, 4, 4, 3],
    ],
    solution: [
      [0, 3],
      [1, 1],
      [2, 4],
      [3, 0],
      [4, 2],
    ],
  },
  {
    id: 3,
    regions: [
      [0, 1, 1, 1, 2],
      [0, 0, 1, 2, 2],
      [3, 0, 4, 4, 2],
      [3, 3, 4, 2, 2],
      [3, 3, 4, 4, 4],
    ],
    solution: [
      [0, 1],
      [1, 4],
      [2, 0],
      [3, 3],
      [4, 2],
    ],
  },
];

const REGION_COLORS = [
  "bg-amber-950/40 border-amber-500/30 text-amber-200",
  "bg-indigo-950/40 border-indigo-500/30 text-indigo-200",
  "bg-emerald-950/40 border-emerald-500/30 text-emerald-200",
  "bg-rose-950/40 border-rose-500/30 text-rose-200",
  "bg-cyan-950/40 border-cyan-500/30 text-cyan-200",
];

type CellState = "EMPTY" | "CROSS" | "QUEEN";

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyPuzzleIndex(): number {
  const today = getTodayString();
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash << 5) - hash + today.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % QUEENS_PUZZLES.length;
}

export function QueensGame() {
  const todayStr = getTodayString();
  const puzzle = QUEENS_PUZZLES[getDailyPuzzleIndex()];

  const [grid, setGrid] = useState<CellState[][]>(() =>
    Array(5)
      .fill(null)
      .map(() => Array(5).fill("EMPTY"))
  );
  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`arcade_daily_queens_${todayStr}`) === "true";
    } catch {
      return false;
    }
  });

  const [conflicts, setConflicts] = useState<[number, number][]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // Validate current board state
  useEffect(() => {
    const queenCoords: [number, number][] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (grid[r][c] === "QUEEN") {
          queenCoords.push([r, c]);
        }
      }
    }

    const badCells: [number, number][] = [];

    // Check conflict between queen pairs
    for (let i = 0; i < queenCoords.length; i++) {
      for (let j = i + 1; j < queenCoords.length; j++) {
        const [r1, c1] = queenCoords[i];
        const [r2, c2] = queenCoords[j];

        const sameRow = r1 === r2;
        const sameCol = c1 === c2;
        const sameRegion = puzzle.regions[r1][c1] === puzzle.regions[r2][c2];
        const isTouching = Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;

        if (sameRow || sameCol || sameRegion || isTouching) {
          badCells.push([r1, c1]);
          badCells.push([r2, c2]);
        }
      }
    }

    setConflicts(badCells);

    // Check completion condition (5 queens, 0 conflicts)
    if (queenCoords.length === 5 && badCells.length === 0) {
      setIsCompleted(true);
      try {
        localStorage.setItem(`arcade_daily_queens_${todayStr}`, "true");
      } catch {
        // Ignore
      }
    }
  }, [grid, puzzle, todayStr]);

  // Toggle cell state
  const handleCellClick = (r: number, c: number) => {
    if (isCompleted) return;

    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      const current = next[r][c];
      if (current === "EMPTY") next[r][c] = "CROSS";
      else if (current === "CROSS") next[r][c] = "QUEEN";
      else next[r][c] = "EMPTY";
      return next;
    });
  };

  const handleReset = () => {
    setGrid(
      Array(5)
        .fill(null)
        .map(() => Array(5).fill("EMPTY"))
    );
  };

  const handleHint = () => {
    if (isCompleted) return;
    // Find a solution queen not yet placed
    const unplaced = puzzle.solution.find(
      ([r, c]) => grid[r][c] !== "QUEEN"
    );
    if (unplaced) {
      const [hr, hc] = unplaced;
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[hr][hc] = "QUEEN";
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Top Banner */}
      <div className="flex w-full items-center justify-between border border-line bg-surface p-4 mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Crown className="size-4 text-signal" />
            <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-paper">
              Daily Queens
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-muted">Challenge for {todayStr}</p>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-success">
              <CheckCircle2 className="size-3.5" />
              Completed
            </span>
          ) : null}

          <button
            type="button"
            onClick={handleHint}
            className={buttonStyles("secondary", "sm")}
            title="Hint"
            disabled={isCompleted}
          >
            <Sparkles className="size-3.5" />
            Hint
          </button>

          <button
            type="button"
            onClick={handleReset}
            className={buttonStyles("secondary", "sm")}
            title="Reset Grid"
          >
            <RotateCcw className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowHelp((prev) => !prev)}
            className={buttonStyles("secondary", "sm")}
            title="Rules"
          >
            <HelpCircle className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Rules */}
      {showHelp ? (
        <div className="w-full border border-line bg-surface-raised p-4 mb-4 text-xs leading-relaxed text-paper-dim animate-in fade-in duration-200">
          <h4 className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-signal mb-2">
            Queens Rules
          </h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Place exactly 1 Queen (👑) in every row, column, and colored region.</li>
            <li>No two Queens can touch each other, even diagonally.</li>
            <li>Click a cell to cycle: Empty → Cross (X) → Queen (👑) → Empty.</li>
          </ul>
        </div>
      ) : null}

      {/* 5x5 Grid */}
      <div className="relative w-full aspect-square border border-line bg-surface p-3 shadow-2xl">
        <div className="grid grid-cols-5 grid-rows-5 gap-1.5 h-full w-full">
          {grid.map((row, r) =>
            row.map((cellState, c) => {
              const regionId = puzzle.regions[r][c];
              const regionClass = REGION_COLORS[regionId % REGION_COLORS.length];
              const isConflicting = conflicts.some(
                ([cr, cc]) => cr === r && cc === c
              );

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  className={`relative flex items-center justify-center border transition-all rounded-xs select-none ${regionClass} ${
                    isConflicting ? "ring-2 ring-error border-error bg-error/20" : ""
                  }`}
                  aria-label={`Row ${r + 1} Col ${c + 1}`}
                >
                  {cellState === "QUEEN" ? (
                    <Crown className="size-6 text-amber-300 drop-shadow-md animate-in zoom-in-75 duration-150" />
                  ) : cellState === "CROSS" ? (
                    <X className="size-4 text-muted/70" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* Completion Modal */}
        {isCompleted ? (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in duration-200">
            <Crown className="size-10 text-signal mb-2" />
            <h3 className="text-2xl font-bold text-paper mb-1">Queens Solved!</h3>
            <p className="text-xs text-muted mb-4 max-w-xs">
              Excellent logic! You solved today&apos;s Queens puzzle for {todayStr}.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className={buttonStyles("secondary", "md")}
            >
              Play Again
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 text-center font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
        Click cell to toggle: Empty · X · Queen 👑
      </div>
    </div>
  );
}
