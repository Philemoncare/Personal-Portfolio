import { ArrowLeft, Play, Trophy } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";

import { MemoryMatchGame } from "./MemoryMatchGame";
import { SnakeGame } from "./SnakeGame";
import { SpaceDodgeGame } from "./SpaceDodgeGame";

type ActiveGame = "landing" | "snake" | "memory" | "space";

export function ArcadeLanding() {
  const [activeGame, setActiveGame] = useState<ActiveGame>("landing");

  // Read best scores from local storage
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

  if (activeGame === "snake") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <button
            type="button"
            onClick={() => setActiveGame("landing")}
            className={buttonStyles("secondary", "sm")}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Arcade
          </button>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal font-semibold">
            Snake 🐍
          </span>
        </div>
        <SnakeGame />
      </div>
    );
  }

  if (activeGame === "memory") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <button
            type="button"
            onClick={() => setActiveGame("landing")}
            className={buttonStyles("secondary", "sm")}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Arcade
          </button>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal font-semibold">
            Memory Match 🧩
          </span>
        </div>
        <MemoryMatchGame />
      </div>
    );
  }

  if (activeGame === "space") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <button
            type="button"
            onClick={() => setActiveGame("landing")}
            className={buttonStyles("secondary", "sm")}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Arcade
          </button>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-signal font-semibold">
            Space Dodge 🚀
          </span>
        </div>
        <SpaceDodgeGame />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Top Header & Navigation back */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-line pb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-signal" aria-hidden="true" />
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-signal">
              Easter Egg
            </p>
          </div>
          <h1 className="mt-3 text-4xl font-medium tracking-tight text-paper sm:text-5xl">
            ARCADE
          </h1>
          <p className="mt-2 text-base text-muted display-serif">
            Take a break. See how long you can survive.
          </p>
        </div>

        <Link to="/" className={buttonStyles("secondary", "sm")}>
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Portfolio
        </Link>
      </div>

      {/* 3 Game Selection Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Snake */}
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
              onClick={() => setActiveGame("snake")}
              className={buttonStyles("primary", "md", "w-full")}
            >
              <Play className="size-3.5" aria-hidden="true" />
              Play Snake
            </button>
          </div>
        </div>

        {/* Card 2: Memory Match */}
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
              onClick={() => setActiveGame("memory")}
              className={buttonStyles("primary", "md", "w-full")}
            >
              <Play className="size-3.5" aria-hidden="true" />
              Play Memory Match
            </button>
          </div>
        </div>

        {/* Card 3: Space Dodge */}
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
              onClick={() => setActiveGame("space")}
              className={buttonStyles("primary", "md", "w-full")}
            >
              <Play className="size-3.5" aria-hidden="true" />
              Play Space Dodge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
