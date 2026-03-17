"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Boxes, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MetadataOverlay } from "@/components/video/metadata-overlay";
import { ObjectOverlay } from "@/components/video/object-overlay";
import type { ShotWithDetails } from "@/lib/types";

type ShotPlayerProps = {
  shot: ShotWithDetails;
};

const legendItems = [
  {
    label: "Motion vector",
    color: "var(--color-overlay-arrow)",
  },
  {
    label: "Shot scale / compound path",
    color: "var(--color-overlay-trajectory)",
  },
  {
    label: "Speed telemetry",
    color: "var(--color-overlay-speed)",
  },
  {
    label: "Badge system",
    color: "var(--color-overlay-badge)",
  },
  {
    label: "Object recognition",
    color: "var(--color-overlay-info)",
  },
] as const;

export function ShotPlayer({ shot }: ShotPlayerProps) {
  const [showOverlay, setShowOverlay] = useState(true);
  const [showObjects, setShowObjects] = useState(true);

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-video overflow-hidden rounded-[calc(var(--radius-xl)_+_6px)] border shadow-[var(--shadow-xl)]"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--color-surface-secondary) 88%, transparent), color-mix(in oklch, var(--color-surface-primary) 92%, transparent))",
          borderColor:
            "color-mix(in oklch, var(--color-border-default) 82%, transparent)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 18%, color-mix(in oklch, var(--color-overlay-arrow) 18%, transparent) 0%, transparent 24%), radial-gradient(circle at 82% 22%, color-mix(in oklch, var(--color-overlay-trajectory) 18%, transparent) 0%, transparent 20%), linear-gradient(180deg, color-mix(in oklch, var(--color-surface-primary) 18%, transparent), color-mix(in oklch, var(--color-surface-primary) 52%, transparent)), repeating-linear-gradient(90deg, transparent 0 79px, color-mix(in oklch, var(--color-border-subtle) 28%, transparent) 79px 80px), repeating-linear-gradient(180deg, transparent 0 79px, color-mix(in oklch, var(--color-border-subtle) 28%, transparent) 79px 80px)",
          }}
        />

        {shot.videoUrl ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={shot.videoUrl}
            poster={shot.thumbnailUrl ?? undefined}
            controls
            muted
            playsInline
            preload="metadata"
          />
        ) : shot.thumbnailUrl ? (
          <Image
            aria-hidden="true"
            alt=""
            src={shot.thumbnailUrl}
            fill
            priority
            sizes="(min-width: 1024px) 960px, 100vw"
            className="absolute inset-0 object-cover"
          />
        ) : null}

        {!shot.videoUrl ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-xl"
            >
              <h2
                className="text-2xl font-semibold tracking-[var(--letter-spacing-snug)] text-[var(--color-text-primary)] sm:text-3xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {shot.film.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
                {shot.semantic?.description ?? "No video clip available. Run the pipeline to attach a media asset."}
              </p>
            </motion.div>
          </div>
        ) : null}

        <div className="absolute right-4 top-4 z-30 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-[var(--color-border-default)] px-3 text-[var(--color-text-primary)] backdrop-blur-xl hover:bg-[var(--color-surface-tertiary)]"
            style={{
              backgroundColor:
                "color-mix(in oklch, var(--color-surface-primary) 58%, transparent)",
            }}
            onClick={() => setShowOverlay((current) => !current)}
          >
            {showOverlay ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            Overlay
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-[var(--color-border-default)] px-3 text-[var(--color-text-primary)] backdrop-blur-xl hover:bg-[var(--color-surface-tertiary)]"
            style={{
              backgroundColor:
                "color-mix(in oklch, var(--color-surface-primary) 58%, transparent)",
            }}
            onClick={() => setShowObjects((current) => !current)}
          >
            <Boxes aria-hidden="true" />
            Objects
          </Button>
        </div>

        {showOverlay ? <MetadataOverlay shot={shot} /> : null}
        <ObjectOverlay objects={shot.objects} visible={showObjects} />
      </div>

      <div
        className="rounded-[var(--radius-xl)] border p-4"
        style={{
          backgroundColor:
            "color-mix(in oklch, var(--color-surface-secondary) 74%, transparent)",
          borderColor:
            "color-mix(in oklch, var(--color-border-subtle) 88%, transparent)",
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
            Overlay legend
          </p>
          <span className="text-sm text-[var(--color-text-secondary)]">
            Color channels map the overlay layers to movement analysis and detected scene elements.
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {legendItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
              className="flex items-center gap-3 rounded-full border px-3 py-2"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--color-surface-primary) 64%, transparent)",
                borderColor:
                  "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
              }}
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full shadow-[var(--shadow-glow)]"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-[var(--color-text-secondary)]">
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
