import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { buttonStyles } from "@/components/ui/button";

type GameState = "IDLE" | "PLAYING" | "PAUSED" | "GAMEOVER";

interface Asteroid {
  x: number;
  y: number;
  radius: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export function SpaceDodgeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem("arcade_spacedodge_best") || "0", 10) || 0;
    } catch {
      return 0;
    }
  });
  const [gameState, setGameState] = useState<GameState>("IDLE");
  const [showInstructions, setShowInstructions] = useState(false);

  const playerRef = useRef<{ x: number; width: number; height: number; speed: number }>({
    x: 180,
    width: 28,
    height: 28,
    speed: 6.5,
  });

  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const asteroidsRef = useRef<Asteroid[]>([]);
  const starsRef = useRef<Star[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);

  const initStars = useCallback((width: number, height: number) => {
    const stars: Star[] = [];
    for (let i = 0; i < 45; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1.5 + 0.5,
      });
    }
    starsRef.current = stars;
  }, []);

  const resetGame = useCallback(() => {
    playerRef.current = { x: 180, width: 28, height: 28, speed: 6.5 };
    asteroidsRef.current = [];
    setScore(0);
    setGameState("PLAYING");
    lastTimeRef.current = performance.now();
    spawnTimerRef.current = 0;
  }, []);

  const pauseGame = () => {
    if (gameState === "PLAYING") setGameState("PAUSED");
  };

  const resumeGame = () => {
    if (gameState === "PAUSED") setGameState("PLAYING");
  };

  // Keyboard controls attached ONLY when playing
  useEffect(() => {
    if (gameState !== "PLAYING") {
      keysRef.current = { left: false, right: false };
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "a", "d", " "].includes(key)) {
        e.preventDefault(); // Intercept page scroll only while actively playing
      }

      if (key === " ") {
        pauseGame();
        return;
      }

      if (key === "arrowleft" || key === "a") keysRef.current.left = true;
      if (key === "arrowright" || key === "d") keysRef.current.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "arrowleft" || key === "a") keysRef.current.left = false;
      if (key === "arrowright" || key === "d") keysRef.current.right = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);

  // Main Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    if (starsRef.current.length === 0) {
      initStars(width, height);
    }

    const updateAndRender = (now: number) => {
      if (gameState === "PLAYING") {
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        setScore((prevScore) => {
          const next = prevScore + 1;
          if (next > bestScore) {
            setBestScore(next);
            try {
              localStorage.setItem("arcade_spacedodge_best", next.toString());
            } catch {
              // Ignore
            }
          }
          return next;
        });

        starsRef.current.forEach((star) => {
          star.y += star.speed;
          if (star.y > height) {
            star.y = 0;
            star.x = Math.random() * width;
          }
        });

        if (keysRef.current.left) {
          playerRef.current.x = Math.max(10, playerRef.current.x - playerRef.current.speed);
        }
        if (keysRef.current.right) {
          playerRef.current.x = Math.min(
            width - playerRef.current.width - 10,
            playerRef.current.x + playerRef.current.speed
          );
        }

        spawnTimerRef.current += delta;
        const spawnInterval = Math.max(0.22, 0.65 - Math.floor(score / 300) * 0.07);

        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;
          const radius = Math.random() * 10 + 10;
          const speed = Math.random() * 2 + 2.5 + Math.min(4, score / 400);
          asteroidsRef.current.push({
            x: Math.random() * (width - radius * 2) + radius,
            y: -radius,
            radius,
            speed,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
          });
        }

        const playerX = playerRef.current.x + playerRef.current.width / 2;
        const playerY = height - 40;

        for (let i = asteroidsRef.current.length - 1; i >= 0; i--) {
          const ast = asteroidsRef.current[i];
          ast.y += ast.speed;
          ast.rotation += ast.rotationSpeed;

          const dx = ast.x - playerX;
          const dy = ast.y - playerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < ast.radius + playerRef.current.width / 2.2) {
            setGameState("GAMEOVER");
            return;
          }

          if (ast.y - ast.radius > height) {
            asteroidsRef.current.splice(i, 1);
          }
        }
      }

      // RENDER
      ctx.fillStyle = "#0a0b0d";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(233, 229, 220, 0.4)";
      starsRef.current.forEach((star) => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      asteroidsRef.current.forEach((ast) => {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rotation);
        ctx.strokeStyle = "rgba(233, 229, 220, 0.7)";
        ctx.fillStyle = "#171a1e";
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        const points = 7;
        for (let p = 0; p < points; p++) {
          const angle = (p / points) * Math.PI * 2;
          const r = ast.radius * (0.8 + Math.sin(p * 3) * 0.2);
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      const px = playerRef.current.x;
      const py = height - 50;
      const pw = playerRef.current.width;
      const ph = playerRef.current.height;

      ctx.save();
      ctx.fillStyle = "#ff4e1f";
      ctx.shadowColor = "#ff4e1f";
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(px + pw / 2, py);
      ctx.lineTo(px + pw, py + ph);
      ctx.lineTo(px + pw / 2, py + ph - 6);
      ctx.lineTo(px, py + ph);
      ctx.closePath();
      ctx.fill();

      if (gameState === "PLAYING") {
        ctx.fillStyle = "#ff7a52";
        ctx.beginPath();
        ctx.moveTo(px + pw / 2 - 4, py + ph - 4);
        ctx.lineTo(px + pw / 2, py + ph + 8 + Math.random() * 4);
        ctx.lineTo(px + pw / 2 + 4, py + ph - 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      if (gameState === "PLAYING") {
        animationFrameRef.current = requestAnimationFrame(updateAndRender);
      }
    };

    if (gameState === "PLAYING") {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(updateAndRender);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, bestScore, score, initStars]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Header Bar */}
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

      {/* Instructions Overlay */}
      {showInstructions ? (
        <div className="w-full max-w-md border border-line bg-surface-raised p-4 mb-4 text-xs leading-relaxed text-paper-dim animate-in fade-in duration-200">
          <h4 className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-signal mb-2">
            How to Play Space Dodge
          </h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Use Left / Right Arrow keys or A / D to steer your spacecraft.</li>
            <li>On mobile devices, hold down the Left / Right touch buttons.</li>
            <li>Dodge incoming asteroids. The longer you survive, the higher your score.</li>
            <li>Difficulty ramps up over time with faster and more frequent asteroids.</li>
            <li>Press Spacebar or click Pause to pause flight.</li>
          </ul>
        </div>
      ) : null}

      {/* Game Canvas Container */}
      <div className="relative w-full max-w-md aspect-[4/5] border border-line bg-background shadow-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={500}
          className="w-full h-full block"
        />

        {/* Start Overlay */}
        {gameState === "IDLE" ? (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-signal mb-2">
              Arcade Survival
            </p>
            <h3 className="text-3xl font-medium tracking-tight text-paper mb-2">Space Dodge 🚀</h3>
            <p className="text-xs text-muted max-w-xs mb-6 leading-relaxed">
              Steer your spacecraft and avoid incoming space debris. Survive as long as you can!
            </p>
            <button
              type="button"
              onClick={resetGame}
              className={buttonStyles("primary", "lg")}
            >
              <Play className="size-4" aria-hidden="true" />
              Launch Ship
            </button>
          </div>
        ) : null}

        {/* Paused Overlay */}
        {gameState === "PAUSED" ? (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted mb-2">
              Mission Paused
            </p>
            <p className="text-sm text-paper mb-6">Press Spacebar or Resume to continue flight</p>
            <button
              type="button"
              onClick={resumeGame}
              className={buttonStyles("primary", "md")}
            >
              <Play className="size-4" aria-hidden="true" />
              Resume Flight
            </button>
          </div>
        ) : null}

        {/* Game Over Overlay */}
        {gameState === "GAMEOVER" ? (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-error mb-1">
              Ship Destroyed
            </p>
            <h3 className="text-3xl font-bold tracking-tight text-paper mb-3">
              {score > 0 && score === bestScore ? "New Best Score!" : "Final Flight Score"}
            </h3>
            <p className="text-4xl font-semibold text-signal tabular-nums mb-6">{score}</p>
            <button
              type="button"
              onClick={resetGame}
              className={buttonStyles("primary", "md")}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Fly Again
            </button>
          </div>
        ) : null}
      </div>

      {/* Touch Controls for Mobile */}
      <div className="mt-6 sm:hidden flex items-center justify-center gap-6">
        <button
          type="button"
          onMouseDown={() => (keysRef.current.left = true)}
          onMouseUp={() => (keysRef.current.left = false)}
          onTouchStart={() => (keysRef.current.left = true)}
          onTouchEnd={() => (keysRef.current.left = false)}
          className="size-14 border border-line bg-surface active:bg-surface-raised flex items-center justify-center text-paper rounded-xs select-none"
          aria-label="Steer Left"
        >
          <ArrowLeft className="size-6" />
        </button>
        <button
          type="button"
          onMouseDown={() => (keysRef.current.right = true)}
          onMouseUp={() => (keysRef.current.right = false)}
          onTouchStart={() => (keysRef.current.right = true)}
          onTouchEnd={() => (keysRef.current.right = false)}
          className="size-14 border border-line bg-surface active:bg-surface-raised flex items-center justify-center text-paper rounded-xs select-none"
          aria-label="Steer Right"
        >
          <ArrowRight className="size-6" />
        </button>
      </div>

      {/* Legend */}
      <div className="mt-4 text-center font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
        Controls: Left/Right Arrows or A/D · Space to Pause
      </div>
    </div>
  );
}
