import {
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-react";
import { useState } from "react";

import { buttonStyles } from "@/components/ui/button";

interface PinpointPuzzle {
  id: number;
  answer: string;
  acceptableAnswers: string[];
  clues: string[];
  hint: string;
}

const PINPOINT_PUZZLES: PinpointPuzzle[] = [
  {
    id: 1,
    answer: "Python",
    acceptableAnswers: ["python", "python3", "py"],
    clues: ["Terminal", "Interpreter", "Indentation", "Django & FastAPI"],
    hint: "High-level programming language known for readable syntax.",
  },
  {
    id: 2,
    answer: "Database",
    acceptableAnswers: ["database", "db", "sql", "postgresql"],
    clues: ["Tables", "Queries", "Primary Keys", "SQLAlchemy"],
    hint: "Structured system for storing and querying persistent data.",
  },
  {
    id: 3,
    answer: "React",
    acceptableAnswers: ["react", "reactjs", "react.js"],
    clues: ["Components", "Hooks", "Virtual DOM", "JSX Layouts"],
    hint: "Popular JavaScript UI library built by Meta.",
  },
  {
    id: 4,
    answer: "Analytics",
    acceptableAnswers: ["analytics", "metrics", "traffic", "telemetry"],
    clues: ["Visitors", "Page Views", "Referrals", "Dashboard Trends"],
    hint: "Measuring and understanding website usage & behavior.",
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
  return Math.abs(hash) % PINPOINT_PUZZLES.length;
}

export function PinpointGame() {
  const todayStr = getTodayString();
  const puzzle = PINPOINT_PUZZLES[getDailyPuzzleIndex()];

  const [revealedCount, setRevealedCount] = useState(1);
  const [guessInput, setGuessInput] = useState("");
  const [attempts, setAttempts] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`arcade_daily_pinpoint_${todayStr}`) === "true";
    } catch {
      return false;
    }
  });

  const handleRevealNextClue = () => {
    if (revealedCount < puzzle.clues.length) {
      setRevealedCount((prev) => prev + 1);
    }
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = guessInput.trim().toLowerCase();
    if (!clean) return;

    if (attempts.includes(clean)) {
      setFeedback("You already tried that word!");
      return;
    }

    setAttempts((prev) => [...prev, clean]);

    if (puzzle.acceptableAnswers.includes(clean)) {
      setIsCompleted(true);
      setFeedback("Correct! You solved today's Pinpoint!");
      try {
        localStorage.setItem(`arcade_daily_pinpoint_${todayStr}`, "true");
      } catch {
        // Ignore
      }
    } else {
      setFeedback(`"${guessInput}" is incorrect. Try another guess or reveal a clue!`);
      setGuessInput("");
    }
  };

  const handleReset = () => {
    setRevealedCount(1);
    setGuessInput("");
    setAttempts([]);
    setFeedback(null);
    setShowHint(false);
  };

  const starsEarned = Math.max(1, 5 - revealedCount);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex w-full items-center justify-between border border-line bg-surface p-4 mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Lightbulb className="size-4 text-amber-400" />
            <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-paper">
              Daily Pinpoint
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-muted">Challenge for {todayStr}</p>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-success">
              <CheckCircle2 className="size-3.5" />
              Solved
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => setShowHint((prev) => !prev)}
            className={buttonStyles("secondary", "sm")}
            title="Hint"
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
        </div>
      </div>

      {/* Main Game Container */}
      <div className="w-full border border-line bg-surface p-6 shadow-2xl space-y-6">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted mb-3">
            Revealed Clues ({revealedCount} of {puzzle.clues.length})
          </p>

          <div className="space-y-2.5">
            {puzzle.clues.map((clue, idx) => {
              const isRevealed = idx < revealedCount;
              return (
                <div
                  key={clue}
                  className={`flex items-center justify-between p-3.5 border transition-all rounded-xs font-mono text-xs ${
                    isRevealed
                      ? "bg-surface-raised border-line-strong text-paper font-medium"
                      : "bg-surface/50 border-line/40 text-faint"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-signal font-bold">#{idx + 1}</span>
                    <span>{isRevealed ? clue : "••••••••••••••••"}</span>
                  </div>
                  {!isRevealed && idx === revealedCount ? (
                    <span className="text-[0.55rem] text-signal uppercase tracking-widest">
                      Next
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!isCompleted && revealedCount < puzzle.clues.length ? (
            <button
              type="button"
              onClick={handleRevealNextClue}
              className={buttonStyles("secondary", "sm", "w-full mt-3")}
            >
              Reveal Next Clue ({puzzle.clues.length - revealedCount} remaining)
            </button>
          ) : null}
        </div>

        {/* Hint Box */}
        {showHint ? (
          <div className="border border-line bg-surface-raised p-3 text-xs leading-relaxed text-paper-dim animate-in fade-in duration-150">
            <span className="font-mono text-[0.55rem] uppercase tracking-wider text-signal block mb-1">
              Hint:
            </span>
            {puzzle.hint}
          </div>
        ) : null}

        {/* Guess Input Form */}
        {!isCompleted ? (
          <form onSubmit={handleGuessSubmit} className="space-y-3">
            <label htmlFor="pinpoint-guess" className="block font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
              What connects all these clues?
            </label>
            <div className="flex gap-2">
              <input
                id="pinpoint-guess"
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Type your guess..."
                className="flex-1 border border-line bg-background px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-signal focus:outline-none rounded-xs"
              />
              <button type="submit" className={buttonStyles("primary", "md")}>
                Guess
              </button>
            </div>
          </form>
        ) : (
          <div className="border border-success/40 bg-success/10 p-5 text-center rounded-xs animate-in fade-in duration-200">
            <CheckCircle2 className="size-8 text-success mx-auto mb-2" />
            <h4 className="text-xl font-bold text-paper mb-1">
              Correct Connection: {puzzle.answer}
            </h4>
            <p className="text-xs text-muted mb-3">
              You identified the common link using {revealedCount} clue(s)!
            </p>
            <div className="flex items-center justify-center gap-1 text-amber-400 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${
                    i < starsEarned ? "fill-amber-400 text-amber-400" : "text-muted/30"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleReset}
              className={buttonStyles("secondary", "sm")}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Feedback Message */}
        {feedback && !isCompleted ? (
          <p className="text-xs text-error font-mono">{feedback}</p>
        ) : null}

        {/* Previous Attempts list */}
        {attempts.length > 0 && !isCompleted ? (
          <div className="pt-2 border-t border-line">
            <p className="font-mono text-[0.52rem] uppercase tracking-wider text-muted mb-1">
              Previous guesses:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {attempts.map((att) => (
                <span
                  key={att}
                  className="px-2 py-0.5 border border-line bg-surface-raised font-mono text-[0.62rem] text-muted rounded-xs"
                >
                  {att}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
