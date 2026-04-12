"use client";

import { useEffect } from "react";

import { spaceTargetKeepsNativeBehavior } from "@/lib/shot-detail-space-key";

/**
 * Disables Space-as-page-scroll on the shot detail route while keeping Space
 * on focused links, buttons, fields, and Video.js.
 */
export function ShotDetailSuppressSpaceScroll() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") {
        return;
      }
      if (spaceTargetKeepsNativeBehavior(e.target)) {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return null;
}
