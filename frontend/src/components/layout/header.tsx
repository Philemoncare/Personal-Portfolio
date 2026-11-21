import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { Wordmark } from "@/components/brand/wordmark";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { label: "Work", to: "/work" },
  { label: "Data Lab", to: "/data-lab" },
  { label: "Build Lab", to: "/build-lab" },
  { label: "Leadership", to: "/leadership" },
  { label: "Articles", to: "/articles" },
  { label: "About", to: "/about" },
  { label: "Now", to: "/now" },
  { label: "Contact", to: "/contact" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  const closeMenu = () => {
    setMenuOpen(false);
    openButtonRef.current?.focus();
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        openButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur-md">
      <Container className="flex h-[var(--header-height)] items-center justify-between gap-6">
        <Wordmark compact className="shrink-0" />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-5 xl:gap-6">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "relative block py-2 font-mono text-[0.66rem] uppercase tracking-[0.16em] transition-colors select-none",
                      isActive ? "text-paper" : "text-muted hover:text-paper",
                    )
                  }
                >
                  {({ isActive }) => (
                    <span className="relative inline-flex items-center gap-1.5">
                      {isActive ? (
                        <span className="size-1 bg-signal" aria-hidden="true" />
                      ) : null}
                      {item.label}
                      {isActive ? (
                        <motion.span
                          layoutId="primary-navigation-active"
                          className="absolute -bottom-2 left-0 right-0 h-px bg-signal"
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:inline-block" />

          <Link
            to="/resume"
            className={buttonStyles("secondary", "sm", "hidden sm:inline-flex")}
          >
            Resume
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>

          <button
            ref={openButtonRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex size-10 items-center justify-center border border-line-strong bg-surface text-paper transition-colors hover:border-paper lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex h-[var(--header-height)] items-center justify-between border-b border-line px-5 sm:px-8">
              <Wordmark compact />
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeMenu}
                  className="inline-flex size-10 items-center justify-center border border-line-strong text-paper"
                  aria-label="Close navigation menu"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
              <ul className="space-y-1">
                {NAV_ITEMS.map((item, index) => (
                  <motion.li
                    key={item.to}
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index, duration: 0.35 }}
                  >
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-baseline justify-between gap-4 border-b border-line py-4 transition-colors",
                          isActive ? "text-paper" : "text-paper-dim hover:text-paper",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className="flex items-baseline gap-3">
                            <span
                              className={cn(
                                "mb-1 size-1.5 shrink-0",
                                isActive ? "bg-signal" : "bg-transparent",
                              )}
                              aria-hidden="true"
                            />
                            <span className="text-[clamp(2rem,9vw,3.5rem)] font-medium leading-none tracking-[-0.04em]">
                              {item.label}
                            </span>
                          </span>
                          <span className="font-mono text-[0.6rem] text-muted">
                            0{index + 1}
                          </span>
                        </>
                      )}
                    </NavLink>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-10 flex flex-col gap-3">
                <Link to="/contact" className={buttonStyles("primary", "lg", "w-full")}>
                  Start a conversation
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
                <Link to="/resume" className={buttonStyles("secondary", "lg", "w-full")}>
                  Resume
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
                <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                  Full-stack development / data / systems
                </p>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
