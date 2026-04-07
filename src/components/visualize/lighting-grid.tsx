"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

import type { VizShot } from "@/lib/types";
import {
  LIGHTING_DIRECTIONS,
  LIGHTING_QUALITIES,
} from "@/lib/taxonomy";

const DIR_ORDER = Object.keys(LIGHTING_DIRECTIONS);
const QUAL_ORDER = Object.keys(LIGHTING_QUALITIES);

type Props = {
  shots: VizShot[];
};

export function LightingGrid({ shots }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 340 });

  const { matrix, maxVal } = useMemo(() => {
    const m = new Map<string, number>();
    let max = 0;
    for (const s of shots) {
      const key = `${s.lightingDirection}\t${s.lightingQuality}`;
      const w = s.duration > 0 ? s.duration : 1;
      const next = (m.get(key) ?? 0) + w;
      m.set(key, next);
      if (next > max) max = next;
    }
    return { matrix: m, maxVal: max || 1 };
  }, [shots]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setSize({ w: Math.min(w, 920), h: 300 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const margin = { top: 24, right: 12, bottom: 44, left: 100 };
    const cw = size.w - margin.left - margin.right;
    const ch = size.h - margin.top - margin.bottom;
    const cellW = cw / QUAL_ORDER.length;
    const cellH = ch / DIR_ORDER.length;
    const color = d3
      .scaleSequential(d3.interpolateOranges)
      .domain([0, maxVal]);

    const g = svg
      .attr("width", size.w)
      .attr("height", size.h)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (shots.length === 0) {
      svg
        .append("text")
        .attr("x", size.w / 2)
        .attr("y", size.h / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#8e8e99")
        .attr("font-size", 12)
        .text("No shots");
      return;
    }

    for (let ri = 0; ri < DIR_ORDER.length; ri++) {
      for (let ci = 0; ci < QUAL_ORDER.length; ci++) {
        const d = DIR_ORDER[ri];
        const q = QUAL_ORDER[ci];
        const v = matrix.get(`${d}\t${q}`) ?? 0;
        g.append("rect")
          .attr("x", ci * cellW + 1)
          .attr("y", ri * cellH + 1)
          .attr("width", cellW - 2)
          .attr("height", cellH - 2)
          .attr("rx", 2)
          .attr("fill", v > 0 ? color(v) : "#14141c")
          .attr("stroke", "#1e1e28");
      }
    }

    const yAxis = g.append("g");
    DIR_ORDER.forEach((dir, ri) => {
      yAxis
        .append("text")
        .attr("x", -8)
        .attr("y", ri * cellH + cellH / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#8e8e99")
        .attr("font-size", 8)
        .attr("font-family", "monospace")
        .text(dir.replace(/_/g, " "));
    });

    const xAxis = g.append("g").attr("transform", `translate(0,${ch + 6})`);
    QUAL_ORDER.forEach((q, ci) => {
      xAxis
        .append("text")
        .attr("x", ci * cellW + cellW / 2)
        .attr("y", 0)
        .attr("text-anchor", "end")
        .attr("transform", `rotate(-50, ${ci * cellW + cellW / 2}, 0)`)
        .attr("fill", "#8e8e99")
        .attr("font-size", 8)
        .attr("font-family", "monospace")
        .text(q.replace(/_/g, " "));
    });
  }, [shots, matrix, maxVal, size]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-[#1e1e28] bg-[#0d0d12] overflow-hidden"
    >
      <div className="px-4 pt-3 pb-1">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#5cb8d6]">
          Lighting · direction × quality
        </h3>
        <p className="mt-1 text-[11px] text-[#55555e]">
          Duration-weighted; color temperature is a separate field in metadata.
        </p>
      </div>
      <svg ref={svgRef} className="mx-auto block" />
    </div>
  );
}
