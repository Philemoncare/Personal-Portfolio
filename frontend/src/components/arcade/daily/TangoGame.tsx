import { CheckCircle2, HelpCircle, Moon, RotateCcw, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonStyles } from "@/components/ui/button";

type SymbolType = "SUN" | "MOON" | "EMPTY";

interface Constraint {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  type: "EQUAL" | "OPPOSITE";
}

interface TangoPuzzle {
  id: number;
  initial: (SymbolType | null)[][];
  constraints: Constraint[];
  solution: SymbolType[][];
}

const TANGO_PUZZLES: TangoPuzzle[] = [
  {
    id: 1,
    initial: [
      ["SUN", null, null, null, null, "MOON"],
      [null, null, null, "SUN", null, null],
      [null, "MOON", null, null, null, null],
      [null, null, null, null, "SUN", null],
      [null, null, "MOON", null, null, null],
      ["MOON", null, null, null, null, "SUN"],
    ],
    constraints: [
      { r1: 0, c1: 1, r2: 0, c2: 2, type: "EQUAL" },
      { r1: 2, c1: 2, r2: 3, c2: 2, type: "OPPOSITE" },
      { r1: 4, c1: 3, r2: 4, c2: 4, type: "EQUAL" },
    ],
    solution: [
      ["SUN", "SUN", "SUN", "MOON", "MOON", "MOON"],
      ["MOON", "MOON", "SUN", "SUN", "MOON", "SUN"],
      ["SUN", "MOON", "MOON", "MOON", "SUN", "SUN"],
      ["MOON", "SUN", "SUN", "SUN", "MOON", "MOON"],
      ["SUN", "MOON", "MOON", "MOON", "SUN", "SUN"],
      ["MOON", "SUN", "SUN", "SUN", "MOON", "SUN"],
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
  return Math.abs(hash) % TANGO_PUZZLES.length;
}

export function TangoGame() {
  const todayStr = getTodayString();
  const puzzle = TANGO_PUZZLES[getDailyPuzzleIndex()];

  const [grid, setGrid] = useState<SymbolType[][]>(() =>
    puzzle.initial.map((row) => row.map((cell) => cell || "EMPTY"))
  );

  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`arcade_daily_tango_${todayStr}`) === "true";
    } catch {
      return false;
    }
  });

  const [showHelp, setShowHelp] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);

  // Real-time grid rule validation
  useEffect(() => {
    let err = false;

    // Rule 1: Check 3-in-a-row or 3-in-a-col duplicates
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        // Horizontal triplet
        const h1 = grid[i][j];
        const h2 = grid[i][j + 1];
        const h3 = grid[i][j + 2];
        if (h1 !== "EMPTY" && h1 === h2 && h2 === h3) err = true;

        // Vertical triplet
        const v1 = grid[j][i];
        const v2 = grid[j + 1][i];
        const v3 = grid[j + 2][i];
        if (v1 !== "EMPTY" && v1 === v2 && v2 === v3) err = true;
      }
    }

    // Rule 2: Check row & col counts
    for (let i = 0; i < 6; i++) {
      let rSun = 0, rMoon = 0;
      let cSun = 0, cMoon = 0;
      for (let j = 0; j < 6; j++) {
        if (grid[i][j] === "SUN") rSun++;
        if (grid[i][j] === "MOON") rMoon++;
        if (grid[j][i] === "SUN") cSun++;
        if (grid[j][i] === "MOON") cMoon++;
      }
      if (rSun > 3 || rMoon > 3 || cSun > 3 || cMoon > 3) err = true;
    }

    // Rule 3: Check constraints
    puzzle.constraints.forEach(({ r1, c1, r2, c2, type }) => {
      const s1 = grid[r1][c1];
      const s2 = grid[r2][c2];
      if (s1 !== "EMPTY" && s2 !== "EMPTY") {
        if (type === "EQUAL" && s1 !== s2) err = true;
        if (type === "OPPOSITE" && s1 === s2) err = true;
      }
    });

    setHasErrors(err);

    // Completion check
    const isFilled = grid.every((row) => row.every((cell) => cell !== "EMPTY"));
    if (isFilled && !err) {
      setIsCompleted(true);
      try {
        localStorage.setItem(`arcade_daily_tango_${todayStr}`, "true");
      } catch {
        // Ignore
      }
    }
  }, [grid, puzzle, todayStr]);

  const handleCellClick = (r: number, c: number) => {
    if (isCompleted) return;
    if (puzzle.initial[r][c] !== null) return; // Fixed initial given

    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      const current = next[r][c];
      if (current === "EMPTY") next[r][c] = "SUN";
      else if (current === "SUN") next[r][c] = "MOON";
      else next[r][c] = "EMPTY";
      return next;
    });
  };

  const handleReset = () => {
    setGrid(puzzle.initial.map((row) => row.map((cell) => cell || "EMPTY")));
  };

  const handleHint = () => {
    if (isCompleted) return;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (grid[r][c] === "EMPTY") {
          const correct = puzzle.solution[r][c];
          setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            next[r][c] = correct;
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
            <Sun className="size-4 text-amber-400" />
            <Moon className="size-4 text-cyan-400" />
            <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-paper">
              Daily Tango
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
            Tango Rules
          </h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Fill every row & column with 3 Suns ☀️ and 3 Moons 🌙.</li>
            <li>No 3 identical symbols can be adjacent in a row or column.</li>
            <li>= means adjacent cells must be identical; x means they must be opposite.</li>
          </ul>
        </div>
      ) : null}

      {/* 6x6 Grid */}
      <div className="relative w-full aspect-square border border-line bg-surface p-3 shadow-2xl">
        <div className="grid grid-cols-6 grid-rows-6 gap-1.5 h-full w-full">
          {grid.map((row, r) =>
            row.map((cellState, c) => {
              const isFixed = puzzle.initial[r][c] !== null;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  disabled={isFixed}
                  className={`relative flex items-center justify-center border transition-all rounded-xs select-none ${
                    isFixed
                      ? "bg-surface-raised border-line-strong text-paper font-bold"
                      : "bg-surface-hover border-line hover:border-paper text-paper-dim"
                  } ${hasErrors && cellState !== "EMPTY" ? "border-error/50" : ""}`}
                >
                  {cellState === "SUN" ? (
                    <Sun className="size-6 text-amber-400 animate-in zoom-in-75 duration-150" />
                  ) : cellState === "MOON" ? (
                    <Moon className="size-6 text-cyan-400 animate-in zoom-in-75 duration-150" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* Completion Modal */}
        {isCompleted ? (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in duration-200">
            <Sparkles className="size-10 text-signal mb-2" />
            <h3 className="text-2xl font-bold text-paper mb-1">Tango Solved!</h3>
            <p className="text-xs text-muted mb-4 max-w-xs">
              Great job! You completed today&apos;s Tango puzzle for {todayStr}.
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
        Click editable cell to toggle: Empty · ☀️ Sun · 🌙 Moon
      </div>
    </div>
  );
}
