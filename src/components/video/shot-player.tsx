"use client";

import Image from "next/image";
import type { MutableRefObject, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MetadataOverlay } from "@/components/video/metadata-overlay";
import { ShotVideoJs } from "@/components/video/shot-video-js";
import { ShotVideoTransport } from "@/components/video/shot-video-transport";
import { getShotPlaybackSegment } from "@/lib/shot-playback-segment";
import type { ShotWithDetails } from "@/lib/types";

type ShotPlayerProps = {
  shot: ShotWithDetails;
  /** When set, attached to the underlying `<video>` for timeline sync (e.g. boundary HITL). */
  videoRef?: RefObject<HTMLVideoElement | null>;
  /** Controlled: seconds into shot (synced from custom transport when present). */
  splitAt?: string;
  onSplitAtChange?: (value: string) => void;
};

export function ShotPlayer({ shot, videoRef, splitAt, onSplitAtChange }: ShotPlayerProps) {
  const [showOverlay, setShowOverlay] = useState(true);
  const [videoAttachTick, setVideoAttachTick] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const setVideoEl = useCallback(
    (node: HTMLVideoElement | null) => {
      localVideoRef.current = node;
      if (videoRef) {
        (videoRef as MutableRefObject<HTMLVideoElement | null>).current = node;
      }
      if (node) {
        setVideoAttachTick((t) => t + 1);
      }
    },
    [videoRef],
  );

  const playbackSegment = useMemo(() => getShotPlaybackSegment(shot), [shot]);
  const segment = useMemo(() => {
    if (!playbackSegment) {
      return null;
    }
    return { offset: playbackSegment.offset, end: playbackSegment.end };
  }, [playbackSegment]);
  const useCustomTransport = Boolean(playbackSegment && shot.videoUrl);

  useEffect(() => {
    const v = localVideoRef.current;
    if (!v || !segment) {
      return;
    }

    const { offset, end } = segment;

    const clamp = () => {
      const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : end;
      const hi = Math.min(end, dur + 0.001);
      if (v.currentTime < offset - 0.05) {
        v.currentTime = offset;
      }
      if (v.currentTime > hi) {
        v.pause();
        v.currentTime = Math.min(end, dur);
      }
    };

    const snapToSegmentStart = () => {
      v.currentTime = offset;
    };

    v.addEventListener("timeupdate", clamp);
    v.addEventListener("seeking", clamp);
    v.addEventListener("loadedmetadata", snapToSegmentStart);

    snapToSegmentStart();
    clamp();

    return () => {
      v.removeEventListener("timeupdate", clamp);
      v.removeEventListener("seeking", clamp);
      v.removeEventListener("loadedmetadata", snapToSegmentStart);
    };
  }, [shot.id, segment, videoAttachTick]);

  return (
    <div className="space-y-4">
      <div
        className="overflow-hidden rounded-[calc(var(--radius-xl)_+_6px)] border shadow-[var(--shadow-xl)]"
        style={{
          borderColor:
            "color-mix(in oklch, var(--color-border-default) 82%, transparent)",
        }}
      >
        <div
          className={
            useCustomTransport
              ? "relative aspect-video overflow-hidden rounded-t-[calc(var(--radius-xl)_+_6px)]"
              : "relative aspect-video overflow-hidden rounded-[calc(var(--radius-xl)_+_6px)]"
          }
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--color-surface-secondary) 88%, transparent), color-mix(in oklch, var(--color-surface-primary) 92%, transparent))",
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
          <ShotVideoJs
            videoUrl={shot.videoUrl}
            posterUrl={shot.thumbnailUrl ?? undefined}
            controls={!useCustomTransport}
            shotKey={`${shot.id}:${shot.videoUrl}`}
            onVideoElement={setVideoEl}
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
            aria-pressed={showOverlay}
          >
            {showOverlay ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            {showOverlay ? "Hide labels" : "Show labels"}
          </Button>
        </div>

        {showOverlay ? <MetadataOverlay shot={shot} /> : null}
        </div>

        {playbackSegment ? (
          <ShotVideoTransport
            videoRef={localVideoRef}
            mediaAnchor={playbackSegment.mediaAnchor}
            startTc={playbackSegment.startTc}
            endTc={playbackSegment.endTc}
            segment={{ offset: playbackSegment.offset, end: playbackSegment.end }}
            shotKey={`${shot.id}:${shot.videoUrl ?? ""}`}
            previewSrc={shot.videoUrl!}
            previewPoster={shot.thumbnailUrl ?? null}
            splitAt={splitAt}
            onSplitAtChange={onSplitAtChange}
          />
        ) : null}
      </div>
    </div>
  );
}
