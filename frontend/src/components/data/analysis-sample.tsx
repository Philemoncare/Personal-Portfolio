import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/utils/cn";

const SAMPLE = [
  { label: "M", value: 38 },
  { label: "T", value: 52 },
  { label: "W", value: 44 },
  { label: "T", value: 66 },
  { label: "F", value: 58 },
  { label: "S", value: 74 },
  { label: "S", value: 69 },
];

export function AnalysisSample() {
  const reduceMotion = useReducedMotion();

  return (
    <figure className="relative border border-line bg-surface p-5 sm:p-6" aria-labelledby="analysis-sample-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <p id="analysis-sample-title" className="type-meta text-paper-dim">
            Analysis sample
          </p>
          <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
            Signal distribution / illustrative
          </p>
        </div>
        <span className="type-meta border border-signal/40 bg-signal/5 px-2 py-1 text-signal-soft">
          Demo data
        </span>
      </div>

      <div className="mt-6 flex h-44 items-end gap-2 border-b border-l border-line pb-0 pl-3" aria-hidden="true">
        {SAMPLE.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex h-full flex-1 items-end">
            <motion.div
              className={cn(
                "w-full origin-bottom",
                index === 5 ? "bg-signal" : "bg-paper/25",
              )}
              style={{ height: `${item.value}%` }}
              initial={reduceMotion ? false : { scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.5,
                delay: 0.04 * index,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2 pl-3" aria-hidden="true">
        {SAMPLE.map((item, index) => (
          <span
            key={`${item.label}-label-${index}`}
            className="flex-1 text-center font-mono text-[0.54rem] uppercase tracking-[0.12em] text-faint"
          >
            {item.label}
          </span>
        ))}
      </div>

      <figcaption className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
        Demonstration data only. This chart illustrates a visual approach and is not a record of
        personal results, clients, or business performance.
      </figcaption>

      <table className="sr-only">
        <caption>Demonstration sample values by day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Illustrative value</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE.map((item, index) => (
            <tr key={`${item.label}-row-${index}`}>
              <th scope="row">{item.label}</th>
              <td>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
