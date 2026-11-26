import { useEffect, useRef, type RefObject } from "react";

export interface GameKeyboardOptions {
  /** Optional container that owns the controls; keys outside it are ignored. */
  scopeRef?: RefObject<HTMLElement | null>;
  /**
   * `event.key` values that must not scroll the page while the game is active
   * (e.g. `"ArrowUp"`, `" "`). Only these keys are ever intercepted.
   */
  captureKeys?: string[];
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Scoped keyboard controls for a single, currently-active game.
 *
 * - Listeners exist only while `enabled` is true, so leaving / pausing a game
 *   automatically restores normal browser scrolling.
 * - `preventDefault` is applied *only* to the keys the game actually consumes.
 * - Keystrokes inside form fields, content-editable regions or with a modifier
 *   key held (Ctrl/Cmd/Alt) always fall through to the browser.
 * - When `scopeRef` is provided, keys are ignored unless focus is inside it.
 */
export function useGameKeyboard(enabled: boolean, options: GameKeyboardOptions = {}): void {
  const { scopeRef } = options;

  const downRef = useRef(options.onKeyDown);
  const upRef = useRef(options.onKeyUp);
  const captureRef = useRef<string[]>(options.captureKeys ?? []);

  downRef.current = options.onKeyDown;
  upRef.current = options.onKeyUp;
  captureRef.current = options.captureKeys ?? [];

  useEffect(() => {
    if (!enabled) return;

    const shouldHandle = (event: KeyboardEvent): boolean => {
      if (event.defaultPrevented) return false;
      if (event.metaKey || event.ctrlKey || event.altKey) return false;
      if (isEditableTarget(event.target)) return false;
      const scope = scopeRef?.current;
      if (scope && event.target instanceof Node && !scope.contains(event.target)) return false;
      return true;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandle(event)) return;
      if (captureRef.current.includes(event.key)) event.preventDefault();
      downRef.current?.(event);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!shouldHandle(event)) return;
      if (captureRef.current.includes(event.key)) event.preventDefault();
      upRef.current?.(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [enabled, scopeRef]);
}
