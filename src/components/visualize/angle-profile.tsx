"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

import type { VizShot } from "@/lib/types";
import {
  HORIZONTAL_ANGLES,
  VERTICAL_ANGLES,
} from "@/lib/taxonomy";

const VORT = Object.keys(VERTICAL_ANGLES);
const HORT = Object.keys(HORIZONTAL_ANGLES);

type Props = {
  shots: VizShot[];
};

export function AngleProfile({ shots }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  const { vertPct, horPct } = useMemo(() => {
    const v: Record<string, number> = Object.fromEntries(VORT.map((k) => [k, 0]));
    const h: Record<string, number> = Object.fromEntries(HORT.map((k) => [k, 0]));
    const n = shots.length || 1;
    for (const s of shots) {
      if (s.angleVertical in v) v[s.angleVertical] += 1;
      if (s.angleHorizontal in h) h[s.angleHorizontal] += 1;
    }
    const vp = VORT.map((k) => ({ key: k, p: (v[k] / n) * 100 }));
    const hp = HORT.map((k) => ({ key: k, p: (h[k] / n) * 100 }));
    return { vertPct: vp, horPct: hp };
  }, [shots]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.min(w, 720));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const rowH = 22;
    const gap = 36;
    const labelW = 100;
    const barW = width - labelW - 32;
    const totalH = VORT.length * rowH + gap + HORT.length * rowH + 56;
    svg.attr("width", width).attr("height", totalH);
    const x = d3.scaleLinear().domain([0, 100]).range([0, barW]);

    if (shots.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", totalH / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#8e8e99")
        .text("No shots");
      return;
    }

    const g = svg.append("g").attr("transform", "translate(12,28)");

    g.append("text")
      .attr("x", 0)
      .attr("y", -8)
      .attr("fill", "#5cb8d6")
      .attr("font-size", 10)
      .attr("font-family", "monospace")
      .text("Vertical angle");

    vertPct.forEach((row, i) => {
      const y = i * rowH;
      g.append("text")
        .attr("x", 0)
        .attr("y", y + rowH / 2)
        .attr("dominant-baseline", "middle")
        .attr("fill", "#8e8e99")
        .attr("font-size", 9)
        .attr("font-family", "monospace")
        .text(row.key.replace(/_/g, " "));
      g.append("rect")
        .attr("x", labelW)
        .attr("y", y + 4)
        .attr("width", x(row.p))
        .attr("height", rowH - 8)
        .attr("fill", "#5cb8d6")
        .attr("opacity", 0.75)
        .attr("rx", 2);
      g.append("text")
        .attr("x", labelW + x(row.p) + 6)
        .attr("y", y + rowH / 2)
        .attr("dominant-baseline", "middle")
        .attr("fill", "#55555e")
        .attr("font-size", 9)
        .text(`${row.p.toFixed(1)}%`);
    });

    const y0 = VORT.length * rowH + gap;
    g.append("text")
      .attr("x", 0)
      .attr("y", y0 - 8)
      .attr("fill", "#5cb8d6")
      .attr("font-size", 10)
      .attr("font-family", "monospace")
      .text("Horizontal angle");

    horPct.forEach((row, i) => {
      const y = y0 + i * rowH;
      g.append("text")
        .attr("x", 0)
        .attr("y", y + rowH / 2)
        .attr("dominant-baseline", "middle")
        .attr("fill", "#8e8e99")
        .attr("font-size", 9)
        .attr("font-family", "monospace")
        .text(row.key.replace(/_/g, " "));
      g.append("rect")
        .attr("x", labelW)
        .attr("y", y + 4)
        .attr("width", x(row.p))
        .attr("height", rowH - 8)
        .attr("fill", "#d6a05c")
        .attr("opacity", 0.75)
        .attr("rx", 2);
      g.append("text")
        .attr("x", labelW + x(row.p) + 6)
        .attr("y", y + rowH / 2)
        .attr("dominant-baseline", "middle")
        .attr("fill", "#55555e")
        .attr("font-size", 9)
        .text(`${row.p.toFixed(1)}%`);
    });
  }, [shots, vertPct, horPct, width]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-[#1e1e28] bg-[#0d0d12] overflow-hidden"
    >
      <div className="px-4 pt-3 pb-1">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#5cb8d6]">
          Angle profile
        </h3>
        <p className="mt-1 text-[11px] text-[#55555e]">
          Share of shots per angle slug (filtered set).
        </p>
      </div>
      <svg ref={svgRef} className="mx-auto block" />
    </div>
  );
}
