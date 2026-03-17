"use client";

import { useState } from "react";
import { Boxes, LoaderCircle, Check, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type DetectObjectsButtonProps = {
  shotId: string;
  hasObjects: boolean;
};

export function DetectObjectsButton({ shotId, hasObjects }: DetectObjectsButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const detect = async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/detect-objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Detection failed");
      }

      setStatus("success");
      router.refresh();
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Detection failed");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={detect}
      disabled={status === "loading"}
      className="rounded-full border-[var(--color-border-default)] px-4 text-[var(--color-text-primary)] backdrop-blur-xl hover:bg-[var(--color-surface-tertiary)]"
      style={{
        backgroundColor: "color-mix(in oklch, var(--color-surface-primary) 58%, transparent)",
      }}
    >
      {status === "loading" ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : status === "success" ? (
        <Check className="size-4 text-[var(--color-status-verified)]" />
      ) : status === "error" ? (
        <AlertCircle className="size-4 text-[var(--color-status-error)]" />
      ) : (
        <Boxes className="size-4" />
      )}
      {status === "loading"
        ? "Detecting..."
        : status === "success"
          ? "Objects detected!"
          : status === "error"
            ? error || "Failed — retry?"
            : hasObjects
              ? "Re-detect Objects"
              : "Detect Objects"}
    </Button>
  );
}
