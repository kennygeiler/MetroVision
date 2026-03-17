"use client";

import { motion, type Variants } from "framer-motion";

import type { ShotWithDetails } from "@/lib/types";

type ObjectOverlayProps = {
  objects: ShotWithDetails["objects"];
  visible: boolean;
};

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function getCategoryColor(category: string | null) {
  switch (category) {
    case "person":
      return "var(--color-overlay-motion)";
    case "vehicle":
      return "var(--color-overlay-badge)";
    case "object":
      return "var(--color-signal-violet)";
    case "environment":
      return "var(--color-overlay-info)";
    case "animal":
      return "var(--color-signal-amber)";
    case "text":
      return "var(--color-text-secondary)";
    default:
      return "var(--color-overlay-speed)";
  }
}

function formatConfidence(confidence: number | null) {
  if (typeof confidence !== "number") {
    return null;
  }

  return `${Math.round(confidence * 100)}%`;
}

function formatAttributes(attributes: Record<string, string> | null) {
  if (!attributes) {
    return null;
  }

  const formatted = Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" • ");

  return formatted || null;
}

export function ObjectOverlay({ objects, visible }: ObjectOverlayProps) {
  if (!visible) {
    return null;
  }

  const positionedObjects = objects.filter(
    (object) =>
      typeof object.bboxX === "number" &&
      typeof object.bboxY === "number" &&
      typeof object.bboxW === "number" &&
      typeof object.bboxH === "number",
  );

  if (positionedObjects.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      aria-hidden="true"
    >
      {positionedObjects.map((object) => {
        const color = getCategoryColor(object.category);
        const confidenceLabel = formatConfidence(object.confidence);
        const attributeLabel = formatAttributes(object.attributes);
        const isHighConfidence = (object.confidence ?? 0) > 0.9;

        return (
          <motion.div
            key={object.id}
            variants={itemVariants}
            className="group absolute pointer-events-auto rounded-[10px] transition-transform duration-200 hover:z-30 hover:scale-[1.01]"
            style={{
              left: `${object.bboxX! * 100}%`,
              top: `${object.bboxY! * 100}%`,
              width: `${object.bboxW! * 100}%`,
              height: `${object.bboxH! * 100}%`,
              border: `2px solid color-mix(in oklch, ${color} 90%, transparent)`,
              backgroundColor: `color-mix(in oklch, ${color} 8%, transparent)`,
            }}
          >
            {isHighConfidence ? (
              <motion.div
                className="absolute inset-0 rounded-[8px]"
                animate={{
                  boxShadow: [
                    `0 0 0 1px color-mix(in oklch, ${color} 56%, transparent), 0 0 18px color-mix(in oklch, ${color} 18%, transparent)`,
                    `0 0 0 1px color-mix(in oklch, ${color} 92%, transparent), 0 0 26px color-mix(in oklch, ${color} 34%, transparent)`,
                    `0 0 0 1px color-mix(in oklch, ${color} 56%, transparent), 0 0 18px color-mix(in oklch, ${color} 18%, transparent)`,
                  ],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            ) : null}
            <div
              className="absolute -left-px -top-px rounded-br-[10px] rounded-tl-[8px] border-b border-r px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-surface-primary)] transition-all duration-200 group-hover:min-w-[10rem]"
              style={{
                fontFamily: "var(--font-mono)",
                backgroundColor: color,
                borderColor: `color-mix(in oklch, ${color} 76%, transparent)`,
                boxShadow: `0 10px 24px color-mix(in oklch, ${color} 14%, transparent)`,
              }}
            >
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span>{object.label}</span>
                {confidenceLabel ? <span>{confidenceLabel}</span> : null}
              </div>
              {attributeLabel ? (
                <div className="mt-1 max-h-0 max-w-0 overflow-hidden whitespace-normal text-[9px] leading-4 opacity-0 transition-all duration-200 group-hover:max-h-20 group-hover:max-w-[16rem] group-hover:opacity-100">
                  {attributeLabel}
                </div>
              ) : null}
            </div>
            <div
              className="absolute -left-[1px] -top-[1px] h-3 w-3 border-l-2 border-t-2"
              style={{ borderColor: color }}
            />
            <div
              className="absolute -bottom-[1px] -right-[1px] h-3 w-3 border-b-2 border-r-2"
              style={{ borderColor: color }}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
