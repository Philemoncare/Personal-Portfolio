import { CheckCircle2, Grid3X3, HelpCircle, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonStyles } from "@/components/ui/button";

interface SudokuPuzzle {
  id: number;
  initial: (number | null)[][]; // 4x4 grid
  solution: number[][];
}

const SUDOKU_PUZZLES: SudokuPuzzle[] = [
  {
    id: 1,
    initial: [
      [1, null, null, 4],
      [null, 3, 2, null],
      [null, 4, 1, null],
      [2, null, null, 3],
    ],
    solution: [
      [1, 2, 3, 4],
      [4, 3, 2, 1],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
    ],
  },
  {
    id: 2,
    initial: [
      [null, 4, 1, null],
      [1, null, null, 2],
      [3, null, null, 4],
      [null, 2, 3, null],
    ],
    solution: [
      [2, 4, 1, 3],
      [1, 3, 4, 2],
      [3, 1, 2, 4],
      [4, 2, 3, 1],
    ],
  },
];

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
  return Math.abs(hash) % SUDOKU_PUZZLES.length;
}

export function SudokuGame() {
  const todayStr = getTodayString();
  const puzzle = SUDOKU_PUZZLES[getDailyPuzzleIndex()];

  const [grid, setGrid] = useState<(number | null)[][]>(() =>
    puzzle.initial.map((row) => [...row])
  );
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);

  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`arcade_daily_sudoku_${todayStr}`) === "true";
    } catch {
      return false;
    }
  });

  const [conflicts, setConflicts] = useState<[number, number][]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // Validate conflicts
  useEffect(() => {
    const bad: [number, number][] = [];

    // Check rows & cols
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const val = grid[i][j];
        if (val === null) continue;

        // Row duplicate check
        for (let c = 0; c < 4; c++) {
          if (c !== j && grid[i][c] === val) {
            bad.push([i, j]);
          }
        }

        // Col duplicate check
        for (let r = 0; r < 4; r++) {
          if (r !== i && grid[r][j] === val) {
            bad.push([i, j]);
          }
        }

        // 2x2 Box duplicate check
        const boxR = Math.floor(i / 2) * 2;
        const boxC = Math.floor(j / 2) * 2;
        for (let r = boxR; r < boxR + 2; r++) {
          for (let c = boxC; c < boxC + 2; c++) {
            if ((r !== i || c !== j) && grid[r][c] === val) {
              bad.push([i, j]);
            }
          }
        }
      }
    }

    setConflicts(bad);

    // Completion check
    const isFilled = grid.every((row) => row.every((val) => val !== null));
    if (isFilled && bad.length === 0) {
      setIsCompleted(true);
      try {
        localStorage.setItem(`arcade_daily_sudoku_${todayStr}`, "true");
      } catch {
        // Ignore
      }
    }
  }, [grid, todayStr]);

  // Keypress number entry
  useEffect(() => {
    if (!selectedCell || isCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 4) {
        const [r, c] = selectedCell;
        if (puzzle.initial[r][c] !== null) return;
        setGrid((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = num;
          return next;
        });
      } else if (e.key === "Backspace" || e.key === "Delete") {
        const [r, c] = selectedCell;
        if (puzzle.initial[r][c] !== null) return;
        setGrid((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = null;
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, isCompleted, puzzle]);

  const handleNumberInput = (num: number | null) => {
    if (!selectedCell || isCompleted) return;
    const [r, c] = selectedCell;
    if (puzzle.initial[r][c] !== null) return;

    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = num;
      return next;
    });
  };

  const handleReset = () => {
    setGrid(puzzle.initial.map((row) => [...row]));
    setSelectedCell(null);
  };

  const handleHint = () => {
    if (isCompleted) return;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === null) {
          const val = puzzle.solution[r][c];
          setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            next[r][c] = val;
            return next;
          });
          return;
        }
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex w-full items-center justify-between border border-line bg-surface p-4 mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Grid3X3 className="size-4 text-signal" />
            <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-paper">
              Mini Sudoku 4x4
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
            title="Reset"
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
            Mini Sudoku Rules
          </h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Fill the 4x4 grid with numbers 1 to 4.</li>
            <li>Each row, column, and 2x2 box must contain digits 1-4 without duplicates.</li>
            <li>Click a cell to select, then click a number button or use keyboard keys 1-4.</li>
          </ul>
        </div>
      ) : null}

      {/* 4x4 Grid */}
      <div className="relative w-full aspect-square border-2 border-line bg-surface p-3 shadow-2xl">
        <div className="grid grid-cols-4 grid-rows-4 gap-1.5 h-full w-full">
          {grid.map((row, r) =>
            row.map((cellVal, c) => {
              const isFixed = puzzle.initial[r][c] !== null;
              const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
              const hasConflict = conflicts.some(([cr, cc]) => cr === r && cc === c);

              // Sub-box border accents
              const borderClasses = `
                ${r === 1 ? "border-b-2 border-b-line-strong" : ""}
                ${c === 1 ? "border-r-2 border-r-line-strong" : ""}
              `;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => setSelectedCell([r, c])}
                  disabled={isFixed}
                  className={`flex items-center justify-center border text-2xl font-semibold transition-all rounded-xs select-none ${borderClasses} ${
                    isFixed
                      ? "bg-surface-raised border-line text-paper font-bold cursor-default"
                      : isSelected
                      ? "bg-surface-hover border-signal ring-2 ring-signal text-paper"
                      : "bg-surface border-line hover:border-paper text-signal"
                  } ${hasConflict ? "border-error text-error bg-error/20" : ""}`}
                >
                  {cellVal !== null ? cellVal : ""}
                </button>
              );
            })
          )}
        </div>

        {/* Completion Modal */}
        {isCompleted ? (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in duration-200">
            <CheckCircle2 className="size-10 text-success mb-2" />
            <h3 className="text-2xl font-bold text-paper mb-1">Sudoku Solved!</h3>
            <p className="text-xs text-muted mb-4 max-w-xs">
              Excellent job! You completed today&apos;s Mini Sudoku for {todayStr}.
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

      {/* On-screen Number Pad */}
      <div className="mt-5 flex items-center justify-center gap-3">
        {[1, 2, 3, 4].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleNumberInput(num)}
            className="size-12 border border-line bg-surface active:bg-surface-raised flex items-center justify-center text-lg font-bold text-paper rounded-xs hover:border-paper"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleNumberInput(null)}
          className="px-4 h-12 border border-line bg-surface font-mono text-xs text-muted hover:text-paper rounded-xs"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
