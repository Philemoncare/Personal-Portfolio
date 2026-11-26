import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { buttonStyles } from "@/components/ui/button";

const GRID_SIZE = 20;
const INITIAL_SPEED = 120;
const MIN_SPEED = 45;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };
type GameState = "IDLE" | "PLAYING" | "PAUSED" | "GAMEOVER";

function getRandomFoodPosition(snake: Point[]): Point {
  while (true) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    const inSnake = snake.some((segment) => segment.x === x && segment.y === y);
    if (!inSnake) return { x, y };
  }
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const [direction, setDirection] = useState<Direction>("UP");
  const [nextDirection, setNextDirection] = useState<Direction>("UP");
  const [food, setFood] = useState<Point>({ x: 10, y: 5 });
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem("arcade_snake_best") || "0", 10) || 0;
    } catch {
      return 0;
    }
  });
  const [gameState, setGameState] = useState<GameState>("IDLE");
  const [showInstructions, setShowInstructions] = useState(false);

  const resetGame = useCallback(() => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    setSnake(initialSnake);
    setDirection("UP");
    setNextDirection("UP");
    setFood(getRandomFoodPosition(initialSnake));
    setScore(0);
    setGameState("PLAYING");
  }, []);

  const pauseGame = () => {
    if (gameState === "PLAYING") setGameState("PAUSED");
  };

  const resumeGame = () => {
    if (gameState === "PAUSED") setGameState("PLAYING");
  };

  // Scoped Keyboard Handler: attached ONLY when PLAYING
  useEffect(() => {
    if (gameState !== "PLAYING") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Intercept game control keys ONLY when playing to prevent page scrolling
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(key)
      ) {
        e.preventDefault();
      }

      if (key === " ") {
        pauseGame();
        return;
      }

      if ((key === "arrowup" || key === "w") && direction !== "DOWN") {
        setNextDirection("UP");
      } else if ((key === "arrowdown" || key === "s") && direction !== "UP") {
        setNextDirection("DOWN");
      } else if ((key === "arrowleft" || key === "a") && direction !== "RIGHT") {
        setNextDirection("LEFT");
      } else if ((key === "arrowright" || key === "d") && direction !== "LEFT") {
        setNextDirection("RIGHT");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, direction]);

  // Main tick loop
  useEffect(() => {
    if (gameState !== "PLAYING") return;

    const currentSpeed = Math.max(
      MIN_SPEED,
      INITIAL_SPEED - Math.floor(score / 20) * 5
    );

    const interval = setInterval(() => {
      setDirection(nextDirection);

      setSnake((prevSnake) => {
        const head = { ...prevSnake[0] };

        switch (nextDirection) {
          case "UP":
            head.y -= 1;
            break;
          case "DOWN":
            head.y += 1;
            break;
          case "LEFT":
            head.x -= 1;
            break;
          case "RIGHT":
            head.x += 1;
            break;
        }

        // Wall collision check
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameState("GAMEOVER");
          return prevSnake;
        }

        // Self collision check
        if (prevSnake.some((seg) => seg.x === head.x && seg.y === head.y)) {
          setGameState("GAMEOVER");
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Food collision check
        if (head.x === food.x && head.y === food.y) {
          setScore((s) => {
            const nextScore = s + 10;
            if (nextScore > bestScore) {
              setBestScore(nextScore);
              try {
                localStorage.setItem("arcade_snake_best", nextScore.toString());
              } catch {
                // Ignore
              }
            }
            return nextScore;
          });
          setFood(getRandomFoodPosition(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, currentSpeed);

    return () => clearInterval(interval);
  }, [gameState, nextDirection, food, score, bestScore]);

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cellSize = size / GRID_SIZE;

    // Background
    ctx.fillStyle = "#101215";
    ctx.fillRect(0, 0, size, size);

    // Subtle grid pattern
    ctx.strokeStyle = "rgba(233, 229, 220, 0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(size, i * cellSize);
      ctx.stroke();
    }

    // Render Food
    const foodX = food.x * cellSize + cellSize / 2;
    const foodY = food.y * cellSize + cellSize / 2;
    const radius = cellSize / 2.7;

    ctx.save();
    ctx.fillStyle = "#ff4e1f";
    ctx.shadowColor = "#ff4e1f";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(foodX, foodY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Render Snake
    snake.forEach((seg, index) => {
      const isHead = index === 0;
      const x = seg.x * cellSize;
      const y = seg.y * cellSize;

      ctx.fillStyle = isHead ? "#ff4e1f" : "rgba(233, 229, 220, 0.85)";
      const pad = isHead ? 1 : 2;

      ctx.beginPath();
      ctx.roundRect(
        x + pad,
        y + pad,
        cellSize - pad * 2,
        cellSize - pad * 2,
        isHead ? 4 : 2
      );
      ctx.fill();
    });
  }, [snake, food]);

  return (
    <div className="flex flex-col items-center w-full" ref={containerRef}>
      {/* Top Header Controls Bar */}
      <div className="flex w-full max-w-md items-center justify-between border border-line bg-surface p-4 mb-4">
        <div>
          <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">Score</p>
          <p className="text-2xl font-semibold tabular-nums text-paper">{score}</p>
        </div>

        <div className="flex items-center gap-2">
          {gameState === "PLAYING" ? (
            <button
              type="button"
              onClick={pauseGame}
              className={buttonStyles("secondary", "sm")}
            >
              <Pause className="size-3.5" aria-hidden="true" />
              Pause
            </button>
          ) : gameState === "PAUSED" ? (
            <button
              type="button"
              onClick={resumeGame}
              className={buttonStyles("primary", "sm")}
            >
              <Play className="size-3.5" aria-hidden="true" />
              Resume
            </button>
          ) : (
            <button
              type="button"
              onClick={resetGame}
              className={buttonStyles("primary", "sm")}
            >
              <Play className="size-3.5" aria-hidden="true" />
              {gameState === "GAMEOVER" ? "Play Again" : "Start"}
            </button>
          )}

          <button
            type="button"
            onClick={resetGame}
            className={buttonStyles("secondary", "sm")}
            title="Restart"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setShowInstructions((prev) => !prev)}
            className={buttonStyles("secondary", "sm")}
            title="Instructions"
          >
            <HelpCircle className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="text-right">
          <p className="flex items-center gap-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
            <Trophy className="size-3 text-signal" aria-hidden="true" />
            Best
          </p>
          <p className="text-2xl font-semibold tabular-nums text-signal">{bestScore}</p>
        </div>
      </div>

      {/* Instructions Panel */}
      {showInstructions ? (
        <div className="w-full max-w-md border border-line bg-surface-raised p-4 mb-4 text-xs leading-relaxed text-paper-dim animate-in fade-in duration-200">
          <h4 className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-signal mb-2">
            How to Play Snake
          </h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Control the snake using Arrow Keys or W/A/S/D on desktop.</li>
            <li>On mobile, use the on-screen directional D-Pad.</li>
            <li>Eat glowing food to score +10 points and grow.</li>
            <li>Avoid running into the outer boundary walls or your own tail.</li>
            <li>Press Spacebar or click Pause to pause at any time.</li>
          </ul>
        </div>
      ) : null}

      {/* Game Canvas Container */}
      <div className="relative w-full max-w-md aspect-square border border-line bg-surface shadow-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full h-full block"
        />

        {/* Start / Idle Overlay */}
        {gameState === "IDLE" ? (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-signal mb-2">
              Classic Arcade
            </p>
            <h3 className="text-3xl font-medium tracking-tight text-paper mb-2">Snake 🐍</h3>
            <p className="text-xs text-muted max-w-xs mb-6 leading-relaxed">
              Navigate the grid, collect food, and build your high score without crashing.
            </p>
            <button
              type="button"
              onClick={resetGame}
              className={buttonStyles("primary", "lg")}
            >
              <Play className="size-4" aria-hidden="true" />
              Start Game
            </button>
          </div>
        ) : null}

        {/* Paused Overlay */}
        {gameState === "PAUSED" ? (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted mb-2">
              Game Paused
            </p>
            <p className="text-sm text-paper mb-6">Press Spacebar or Resume to continue</p>
            <button
              type="button"
              onClick={resumeGame}
              className={buttonStyles("primary", "md")}
            >
              <Play className="size-4" aria-hidden="true" />
              Resume
            </button>
          </div>
        ) : null}

        {/* Game Over Overlay */}
        {gameState === "GAMEOVER" ? (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-error mb-1">
              Game Over
            </p>
            <h3 className="text-3xl font-bold tracking-tight text-paper mb-2">
              {score > 0 && score === bestScore ? "New Best Score!" : "Final Score"}
            </h3>
            <p className="text-4xl font-semibold text-signal tabular-nums mb-6">{score}</p>
            <button
              type="button"
              onClick={resetGame}
              className={buttonStyles("primary", "md")}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Play Again
            </button>
          </div>
        ) : null}
      </div>

      {/* Touch D-Pad for Mobile */}
      <div className="mt-6 sm:hidden flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => direction !== "DOWN" && setNextDirection("UP")}
          className="size-12 border border-line bg-surface active:bg-surface-raised flex items-center justify-center text-paper rounded-xs"
          aria-label="Move Up"
        >
          <ArrowUp className="size-5" />
        </button>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => direction !== "RIGHT" && setNextDirection("LEFT")}
            className="size-12 border border-line bg-surface active:bg-surface-raised flex items-center justify-center text-paper rounded-xs"
            aria-label="Move Left"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => direction !== "UP" && setNextDirection("DOWN")}
            className="size-12 border border-line bg-surface active:bg-surface-raised flex items-center justify-center text-paper rounded-xs"
            aria-label="Move Down"
          >
            <ArrowDown className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => direction !== "LEFT" && setNextDirection("RIGHT")}
            className="size-12 border border-line bg-surface active:bg-surface-raised flex items-center justify-center text-paper rounded-xs"
            aria-label="Move Right"
          >
            <ArrowRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 text-center font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
        Controls: Arrow Keys / WASD · Space to Pause
      </div>
    </div>
  );
}
