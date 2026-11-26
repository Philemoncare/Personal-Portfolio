import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Grid3X3,
  Lightbulb,
  Play,
  Sun,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";

import { QueensGame } from "./daily/QueensGame";
import { PinpointGame } from "./daily/PinpointGame";
import { SudokuGame } from "./daily/SudokuGame";
import { TangoGame } from "./daily/TangoGame";
import { MemoryMatchGame } from "./MemoryMatchGame";
import { SnakeGame } from "./SnakeGame";
import { SpaceDodgeGame } from "./SpaceDodgeGame";

type GameTab = "arcade" | "daily";
type SelectedGame =
  | "none"
  | "snake"
  | "memory"
  | "space"
  | "queens"
  | "tango"
  | "pinpoint"
  | "sudoku";

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ArcadeLanding() {
  const [activeTab, setActiveTab] = useState<GameTab>("arcade");
  const [selectedGame, setSelectedGame] = useState<SelectedGame>("none");

  const todayStr = getTodayString();

  // Read high scores & completion states
  const snakeBest = (() => {
    try {
      return parseInt(localStorage.getItem("arcade_snake_best") || "0", 10) || 0;
    } catch {
      return 0;
    }
  })();

  const memoryBest = (() => {
    try {
      return parseInt(localStorage.getItem("arcade_memory_best") || "0", 10) || 0;
    } catch {
      return 0;
    }
  })();

  const spaceBest = (() => {
    try {
      return parseInt(localStorage.getItem("arcade_spacedodge_best") || "0", 10) || 0;
    } catch {
      return 0;
    }
  })();

  const queensDone = (() => {
    try {
      return localStorage.getItem(`arcade_daily_queens_${todayStr}`) === "true";
    } catch {
      return false;
    }
  })();

  const tangoDone = (() => {
    try {
      return localStorage.getItem(`arcade_daily_tango_${todayStr}`) === "true";
    } catch {
      return false;
    }
  })();

  const pinpointDone = (() => {
    try {
      return localStorage.getItem(`arcade_daily_pinpoint_${todayStr}`) === "true";
    } catch {
      return false;
    }
  })();

  const sudokuDone = (() => {
    try {
      return localStorage.getItem(`arcade_daily_sudoku_${todayStr}`) === "true";
    } catch {
      return false;
    }
  })();

  const completedDailyCount = [queensDone, tangoDone, pinpointDone, sudokuDone].filter(Boolean).length;

  // Render individual active game
  if (selectedGame !== "none") {
    let title = "";
    let Component = null;

    switch (selectedGame) {
      case "snake":
        title = "Snake 🐍";
        Component = <SnakeGame />;
        break;
      case "memory":
        title = "Memory Match 🧩";
        Component = <MemoryMatchGame />;
        break;
      case "space":
        title = "Space Dodge 🚀";
        Component = <SpaceDodgeGame />;
        break;
      case "queens":
        title = "Daily Queens 👑";
        Component = <QueensGame />;
        break;
      case "tango":
        title = "Daily Tango ☀️🌙";
        Component = <TangoGame />;
        break;
      case "pinpoint":
        title = "Daily Pinpoint 💡";
        Component = <PinpointGame />;
        break;
      case "sudoku":
        title = "Daily Mini Sudoku 🔢";
        Component = <SudokuGame />;
        break;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <button
            type="button"
            onClick={() => setSelectedGame("none")}
            className={buttonStyles("secondary", "sm")}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Arcade
          </button>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal font-semibold">
            {title}
          </span>
        </div>
        {Component}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Back Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-line pb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-signal" aria-hidden="true" />
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-signal">
              Easter Egg
            </p>
          </div>
          <h1 className="mt-3 text-4xl font-medium tracking-tight text-paper sm:text-5xl">
            ARCADE & DAILY CHALLENGES
          </h1>
          <p className="mt-2 text-base text-muted display-serif">
            Take a break. Test your skills or tackle today&apos;s daily logic puzzles.
          </p>
        </div>

        <Link to="/" className={buttonStyles("secondary", "sm")}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Portfolio
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-line pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("arcade")}
          className={`font-mono text-xs uppercase tracking-[0.16em] py-2 px-4 transition-colors rounded-xs ${
            activeTab === "arcade"
              ? "bg-surface-raised text-paper border border-line-strong font-semibold"
              : "text-muted hover:text-paper"
          }`}
        >
          Arcade Games (3)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("daily")}
          className={`font-mono text-xs uppercase tracking-[0.16em] py-2 px-4 transition-colors rounded-xs flex items-center gap-2 ${
            activeTab === "daily"
              ? "bg-surface-raised text-paper border border-line-strong font-semibold"
              : "text-muted hover:text-paper"
          }`}
        >
          Daily Challenges ({completedDailyCount}/4)
          {completedDailyCount > 0 ? (
            <span className="size-2 bg-success rounded-full" />
          ) : null}
        </button>
      </div>

      {/* TAB 1: Arcade Classic Games */}
      {activeTab === "arcade" ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Snake */}
          <div className="group border border-line bg-surface p-6 flex flex-col justify-between transition-colors hover:border-line-strong hover:bg-surface-raised">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl" role="img" aria-label="Snake">
                  🐍
                </span>
                {snakeBest > 0 ? (
                  <div className="flex items-center gap-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-signal">
                    <Trophy className="size-3" />
                    Best: {snakeBest}
                  </div>
                ) : null}
              </div>

              <h3 className="text-2xl font-medium text-paper">Snake</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Classic. Simple. Addictive.
              </p>
              <p className="mt-3 text-xs text-muted/80">
                Navigate the grid, collect food, and grow without crashing into walls or yourself.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedGame("snake")}
                className={buttonStyles("primary", "md", "w-full")}
              >
                <Play className="size-3.5" aria-hidden="true" />
                Play Snake
              </button>
            </div>
          </div>

          {/* Memory Match */}
          <div className="group border border-line bg-surface p-6 flex flex-col justify-between transition-colors hover:border-line-strong hover:bg-surface-raised">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl" role="img" aria-label="Memory Match">
                  🧩
                </span>
                {memoryBest > 0 ? (
                  <div className="flex items-center gap-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-signal">
                    <Trophy className="size-3" />
                    Best: {memoryBest} moves
                  </div>
                ) : null}
              </div>

              <h3 className="text-2xl font-medium text-paper">Memory Match</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                How good is your memory?
              </p>
              <p className="mt-3 text-xs text-muted/80">
                Flip and pair portfolio technology tiles in as few moves as possible.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedGame("memory")}
                className={buttonStyles("primary", "md", "w-full")}
              >
                <Play className="size-3.5" aria-hidden="true" />
                Play Memory Match
              </button>
            </div>
          </div>

          {/* Space Dodge */}
          <div className="group border border-line bg-surface p-6 flex flex-col justify-between transition-colors hover:border-line-strong hover:bg-surface-raised">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl" role="img" aria-label="Space Dodge">
                  🚀
                </span>
                {spaceBest > 0 ? (
                  <div className="flex items-center gap-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-signal">
                    <Trophy className="size-3" />
                    Best: {spaceBest}
                  </div>
                ) : null}
              </div>

              <h3 className="text-2xl font-medium text-paper">Space Dodge</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Avoid everything. Stay alive.
              </p>
              <p className="mt-3 text-xs text-muted/80">
                Pilot your ship and steer clear of incoming space debris as speed increases.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedGame("space")}
                className={buttonStyles("primary", "md", "w-full")}
              >
                <Play className="size-3.5" aria-hidden="true" />
                Play Space Dodge
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 2: LinkedIn-Inspired Daily Challenges */}
      {activeTab === "daily" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Daily Queens */}
          <div className="border border-line bg-surface p-5 flex flex-col justify-between transition-colors hover:border-line-strong">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Crown className="size-6 text-amber-400" />
                {queensDone ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-wider text-success">
                    <CheckCircle2 className="size-3" /> Done
                  </span>
                ) : (
                  <span className="font-mono text-[0.55rem] uppercase tracking-wider text-muted">
                    Today
                  </span>
                )}
              </div>
              <h4 className="text-xl font-medium text-paper">Queens</h4>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                Place 5 queens on the board with no 2 queens sharing a row, col, region, or diagonal touch.
              </p>
            </div>

            <div className="mt-6 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedGame("queens")}
                className={buttonStyles("secondary", "sm", "w-full")}
              >
                {queensDone ? "Replay Queens" : "Play Queens"}
              </button>
            </div>
          </div>

          {/* Daily Tango */}
          <div className="border border-line bg-surface p-5 flex flex-col justify-between transition-colors hover:border-line-strong">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1">
                  <Sun className="size-5 text-amber-400" />
                  <span className="text-cyan-400 text-sm font-bold">🌙</span>
                </div>
                {tangoDone ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-wider text-success">
                    <CheckCircle2 className="size-3" /> Done
                  </span>
                ) : (
                  <span className="font-mono text-[0.55rem] uppercase tracking-wider text-muted">
                    Today
                  </span>
                )}
              </div>
              <h4 className="text-xl font-medium text-paper">Tango</h4>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                Fill the grid with Suns & Moons following equality (=) and opposite (x) constraints.
              </p>
            </div>

            <div className="mt-6 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedGame("tango")}
                className={buttonStyles("secondary", "sm", "w-full")}
              >
                {tangoDone ? "Replay Tango" : "Play Tango"}
              </button>
            </div>
          </div>

          {/* Daily Pinpoint */}
          <div className="border border-line bg-surface p-5 flex flex-col justify-between transition-colors hover:border-line-strong">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Lightbulb className="size-6 text-amber-400" />
                {pinpointDone ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-wider text-success">
                    <CheckCircle2 className="size-3" /> Done
                  </span>
                ) : (
                  <span className="font-mono text-[0.55rem] uppercase tracking-wider text-muted">
                    Today
                  </span>
                )}
              </div>
              <h4 className="text-xl font-medium text-paper">Pinpoint</h4>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                Identify the common link between revealed clues in as few steps as possible.
              </p>
            </div>

            <div className="mt-6 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedGame("pinpoint")}
                className={buttonStyles("secondary", "sm", "w-full")}
              >
                {pinpointDone ? "Replay Pinpoint" : "Play Pinpoint"}
              </button>
            </div>
          </div>

          {/* Daily Mini Sudoku */}
          <div className="border border-line bg-surface p-5 flex flex-col justify-between transition-colors hover:border-line-strong">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Grid3X3 className="size-6 text-signal" />
                {sudokuDone ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-wider text-success">
                    <CheckCircle2 className="size-3" /> Done
                  </span>
                ) : (
                  <span className="font-mono text-[0.55rem] uppercase tracking-wider text-muted">
                    Today
                  </span>
                )}
              </div>
              <h4 className="text-xl font-medium text-paper">Mini Sudoku</h4>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                Solve a compact 4x4 Sudoku grid with digits 1 through 4.
              </p>
            </div>

            <div className="mt-6 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedGame("sudoku")}
                className={buttonStyles("secondary", "sm", "w-full")}
              >
                {sudokuDone ? "Replay Sudoku" : "Play Sudoku"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
