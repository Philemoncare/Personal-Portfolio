import {
  BarChart2,
  Cloud,
  Code2,
  Database,
  Flame,
  GitBranch,
  Globe,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { buttonStyles } from "@/components/ui/button";

interface TechItem {
  name: string;
  icon: typeof Code2;
  color: string;
}

const TECH_ITEMS: TechItem[] = [
  { name: "Python", icon: Flame, color: "text-amber-400" },
  { name: "SQL", icon: Database, color: "text-blue-400" },
  { name: "React", icon: Sparkles, color: "text-cyan-400" },
  { name: "JavaScript", icon: Code2, color: "text-yellow-400" },
  { name: "AWS", icon: Cloud, color: "text-orange-400" },
  { name: "GitHub", icon: GitBranch, color: "text-purple-400" },
  { name: "Data", icon: BarChart2, color: "text-emerald-400" },
  { name: "Analytics", icon: Globe, color: "text-signal" },
];

interface Card {
  id: number;
  item: TechItem;
  isFlipped: boolean;
  isMatched: boolean;
}

export function MemoryMatchGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [, setMatches] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [bestMoves, setBestMoves] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem("arcade_memory_best") || "0", 10) || 0;
    } catch {
      return 0;
    }
  });

  const initializeGame = useCallback(() => {
    const deck: Card[] = [];
    let idCounter = 0;

    // Create 2 of each tech item
    TECH_ITEMS.forEach((item) => {
      deck.push({ id: idCounter++, item, isFlipped: false, isMatched: false });
      deck.push({ id: idCounter++, item, isFlipped: false, isMatched: false });
    });

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setSeconds(0);
    setIsPlaying(true);
    setIsCompleted(false);
  }, []);

  // Initialize deck on mount
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Timer loop
  useEffect(() => {
    if (!isPlaying || isCompleted) return;

    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, isCompleted]);

  // Card click handler
  const handleCardClick = (index: number) => {
    if (!isPlaying || isCompleted) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;
    if (flippedCards.length >= 2) return;

    // Flip card
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newFlipped;

      if (cards[firstIdx].item.name === cards[secondIdx].item.name) {
        // Match found
        setTimeout(() => {
          setCards((prev) => {
            const updated = [...prev];
            updated[firstIdx].isMatched = true;
            updated[secondIdx].isMatched = true;
            return updated;
          });
          setFlippedCards([]);
          setMatches((m) => {
            const nextMatches = m + 1;
            if (nextMatches === TECH_ITEMS.length) {
              // Game Completed
              setIsCompleted(true);
              const currentMoves = moves + 1;
              if (bestMoves === 0 || currentMoves < bestMoves) {
                setBestMoves(currentMoves);
                try {
                  localStorage.setItem("arcade_memory_best", currentMoves.toString());
                } catch {
                  // Ignore storage error
                }
              }
            }
            return nextMatches;
          });
        }, 300);
      } else {
        // Not a match: flip back after delay
        setTimeout(() => {
          setCards((prev) => {
            const updated = [...prev];
            updated[firstIdx].isFlipped = false;
            updated[secondIdx].isFlipped = false;
            return updated;
          });
          setFlippedCards([]);
        }, 800);
      }
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? "0" : ""}${remSecs}`;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Header Stats */}
      <div className="flex w-full max-w-md items-center justify-between border border-line bg-surface p-4 mb-4">
        <div>
          <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">Moves</p>
          <p className="text-2xl font-semibold tabular-nums text-paper">{moves}</p>
        </div>

        <div className="text-center">
          <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">Time</p>
          <p className="text-2xl font-semibold tabular-nums text-paper">{formatTime(seconds)}</p>
        </div>

        <button
          type="button"
          onClick={initializeGame}
          className={buttonStyles("secondary", "sm")}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Restart
        </button>

        <div className="text-right">
          <p className="flex items-center gap-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
            <Trophy className="size-3 text-signal" aria-hidden="true" />
            Best Moves
          </p>
          <p className="text-2xl font-semibold tabular-nums text-signal">
            {bestMoves === 0 ? "-" : bestMoves}
          </p>
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative w-full max-w-md border border-line bg-surface p-4 shadow-2xl">
        <div className="grid grid-cols-4 gap-3">
          {cards.map((card, index) => {
            const Icon = card.item.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCardClick(index)}
                disabled={card.isFlipped || card.isMatched}
                className={`aspect-square w-full border transition-all duration-300 flex flex-col items-center justify-center p-2 rounded-xs select-none ${
                  card.isFlipped || card.isMatched
                    ? "bg-surface-raised border-signal text-paper scale-95"
                    : "bg-surface-hover border-line hover:border-paper hover:bg-surface-active text-muted"
                }`}
                aria-label={card.isFlipped || card.isMatched ? card.item.name : `Card ${index + 1}`}
              >
                {card.isFlipped || card.isMatched ? (
                  <div className="flex flex-col items-center gap-1 animate-in fade-in duration-200">
                    <Icon className={`size-6 ${card.item.color}`} />
                    <span className="font-mono text-[0.55rem] uppercase tracking-[0.08em] text-paper">
                      {card.item.name}
                    </span>
                  </div>
                ) : (
                  <div className="font-mono text-[0.62rem] tracking-[0.15em] text-faint">
                    ?
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Completion Overlay */}
        {isCompleted ? (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-signal mb-1">
              Puzzle Solved!
            </p>
            <h3 className="text-3xl font-bold tracking-tight text-paper mb-2">Memory Match</h3>
            <p className="text-sm text-muted mb-4">
              Completed in <span className="text-paper font-semibold">{moves} moves</span> and{" "}
              <span className="text-paper font-semibold">{formatTime(seconds)}</span>.
            </p>
            <button
              type="button"
              onClick={initializeGame}
              className={buttonStyles("primary", "md")}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Play Again
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 text-center font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
        Click or tap cards to flip & match portfolio technologies
      </div>
    </div>
  );
}
