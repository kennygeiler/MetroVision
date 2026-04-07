"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

import type { VizShot } from "@/lib/types";
import { DURATION_CATEGORIES } from "@/lib/taxonomy";

const CAT_ORDER = Object.keys(DURATION_CATEGORIES);

type Props = {
  shots: VizShot[];
};

export function DurationCategoryChart({ shots }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  const counts = useMemo(() => {
    const c: Record<string, number> = Object.fromEntries(
      CAT_ORDER.map((k) => [k, 0]),
    );
    for (const s of shots) {
      const k = s.durationCategory;
      if (k in c) c[k] += 1;
      else c.standard += 1;
    }
    return CAT_ORDER.map((k) => ({ key: k, n: c[k] ?? 0 }));
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
    const margin = { top: 16, right: 16, bottom: 64, left: 36 };
    const h = 220;
    const iw = width - margin.left - margin.right;
    const ih = h - margin.top - margin.bottom;
    const maxN = d3.max(counts, (d) => d.n) ?? 1;
    const x = d3
      .scaleBand()
      .domain(CAT_ORDER)
      .range([0, iw])
      .padding(0.2);
    const y = d3.scaleLinear().domain([0, maxN]).nice().range([ih, 0]);

    const g = svg
      .attr("width", width)
      .attr("height", h)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (shots.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", h / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#8e8e99")
        .text("No shots");
      return;
    }

    g.selectAll("rect")
      .data(counts)
      .join("rect")
      .attr("x", (d) => x(d.key)!)
      .attr("y", (d) => y(d.n))
      .attr("width", x.bandwidth())
      .attr("height", (d) => ih - y(d.n))
      .attr("fill", "#5cb8d6")
      .attr("opacity", 0.85)
      .attr("rx", 2);

    g.selectAll("text.val")
      .data(counts.filter((d) => d.n > 0))
      .join("text")
      .attr("class", "val")
      .attr("x", (d) => x(d.key)! + x.bandwidth() / 2)
      .attr("y", (d) => y(d.n) - 4)
      .attr("text-anchor", "middle")
      .attr("fill", "#8e8e99")
      .attr("font-size", 9)
      .attr("font-family", "monospace")
      .text((d) => String(d.n));

    g.append("g")
      .attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-38)")
      .style("text-anchor", "end")
      .attr("fill", "#8e8e99")
      .attr("font-size", 8)
      .text((d) => String(d).replace(/_/g, " "));
  }, [shots, counts, width]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-[#1e1e28] bg-[#0d0d12] overflow-hidden"
    >
      <div className="px-4 pt-3 pb-1">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#5cb8d6]">
          Duration category
        </h3>
        <p className="mt-1 text-[11px] text-[#55555e]">
          Shot counts by editorial duration class (taxonomy).
        </p>
      </div>
      <svg ref={svgRef} className="mx-auto block" />
    </div>
  );
}
