"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";

import type { VizShot } from "@/lib/types";
import { DURATION_CATEGORIES } from "@/lib/taxonomy";

const CAT_ORDER = Object.keys(DURATION_CATEGORIES);
const BAND = 40;

type Props = {
  shots: VizShot[];
};

/** Per–duration-category ridgelines: shot length (s) distribution (histogram-based joy/violin). */
export function DurationRidgeline({ shots }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  const rows = useMemo(() => {
    const by = d3.group(shots, (s) => s.durationCategory);
    return CAT_ORDER.filter((cat) => (by.get(cat)?.length ?? 0) > 0).map((cat) => ({
      key: cat,
      values: (by.get(cat) ?? []).map((s) => Math.max(0.05, s.duration)),
    }));
  }, [shots]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.min(w, 920));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 10, right: 20, bottom: 36, left: 128 };
    const innerH = Math.max(BAND, rows.length * BAND);
    const h = innerH + margin.top + margin.bottom;
    const iw = width - margin.left - margin.right;

    if (rows.length === 0 || shots.length === 0) {
      svg
        .attr("width", width)
        .attr("height", 72)
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("fill", "#8e8e99")
        .attr("font-size", 11)
        .text("No shots");
      return;
    }

    const allVals = rows.flatMap((r) => r.values);
    const sorted = d3.sort(allVals, d3.ascending);
    const q99 = sorted.length
      ? (d3.quantileSorted(sorted, 0.99) ?? sorted[sorted.length - 1])
      : 1;
    const xMax = Math.max(1, q99, d3.max(allVals) ?? 1);
    const x = d3.scaleLinear().domain([0, xMax]).nice().range([0, iw]);

    const g = svg
      .attr("width", width)
      .attr("height", h)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    rows.forEach((row, i) => {
      const cy = i * BAND + BAND / 2;
      const bins = d3
        .bin()
        .domain(x.domain() as [number, number])
        .thresholds(
          Math.min(32, Math.max(8, Math.ceil(Math.sqrt(row.values.length)))),
        )(row.values);
      const peak = d3.max(bins, (b) => b.length) ?? 1;
      const amp = BAND / 2 - 5;

      const rowArea = d3
        .area<d3.Bin<number, number>>()
        .x((d) => x(((d.x0 ?? 0) + (d.x1 ?? 0)) / 2))
        .y0((d) => cy - (d.length / peak) * amp)
        .y1((d) => cy + (d.length / peak) * amp)
        .curve(d3.curveCatmullRom);

      g.append("path")
        .datum(bins)
        .attr("fill", "rgba(92,184,214,0.28)")
        .attr("stroke", "#5cb8d6")
        .attr("stroke-width", 0.75)
        .attr("d", rowArea);

      g.append("text")
        .attr("x", -10)
        .attr("y", cy)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#8e8e99")
        .attr("font-size", 8)
        .attr("font-family", "ui-monospace, monospace")
        .text(row.key.replace(/_/g, " "));
    });

    const xAxis = d3.axisBottom(x).ticks(6).tickFormat((d) => `${d}`);
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis)
      .call((s) => s.select(".domain").attr("stroke", "#2a2a34"))
      .call((s) =>
        s
          .selectAll("text")
          .attr("fill", "#55555e")
          .attr("font-size", 8)
          .attr("font-family", "ui-monospace, monospace"),
      );

    g.append("text")
      .attr("x", iw / 2)
      .attr("y", innerH + 28)
      .attr("text-anchor", "middle")
      .attr("fill", "#55555e")
      .attr("font-size", 9)
      .attr("font-family", "ui-monospace, monospace")
      .text("Shot duration (s)");
  }, [shots, rows, width]);

  return (
    <div
      ref={containerRef}
      id="duration-ridgeline"
      className="scroll-mt-28 rounded-xl border border-[#1e1e28] bg-[#0d0d12] overflow-hidden"
    >
      <div className="px-4 pt-3 pb-1">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#5cb8d6]">
          Duration by category (ridgeline)
        </h3>
        <p className="mt-1 text-[11px] text-[#55555e]">
          Distribution of shot length within each editorial duration class (joy-style density).
        </p>
      </div>
      <svg ref={svgRef} className="mx-auto block" />
    </div>
  );
}
