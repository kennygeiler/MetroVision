"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ArchiveDemoSliceActionsProps = {
  spotlightShotId: string | null;
};

export function ArchiveDemoSliceActions({
  spotlightShotId,
}: ArchiveDemoSliceActionsProps) {
  return (
    <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:mt-8 sm:max-w-none sm:flex-row sm:flex-wrap">
      <Link
        href="/browse"
        className={cn(
          buttonVariants({ size: "lg" }),
          "w-full justify-center rounded-full px-6 text-sm shadow-[var(--shadow-glow)] sm:w-auto sm:text-base",
        )}
      >
        Start at browse
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
      {spotlightShotId ? (
        <Link
          href={`/shot/${spotlightShotId}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full justify-center rounded-full border-[var(--color-border-default)] px-6 text-sm text-[var(--color-text-primary)] backdrop-blur-xl sm:w-auto sm:text-base",
          )}
          style={{
            backgroundColor:
              "color-mix(in oklch, var(--color-surface-secondary) 52%, transparent)",
          }}
        >
          Open featured shot
        </Link>
      ) : null}
    </div>
  );
}
