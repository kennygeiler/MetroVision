"use client";

import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { VizFilm, VizShot } from "@/lib/types";
import { colorForFraming } from "@/lib/viz-colors";

type RhythmStreamProps = {
  shots: VizShot[];
  films: VizFilm[];
};

/* ------------------------------------------------------------------ */
/*  Theme tokens                                                       */
/* ------------------------------------------------------------------ */

const BG = "#0d0d12";
const TEXT = "#f5f5f7";
const SECONDARY = "#8e8e99";
const TERTIARY = "#55555e";
const CYAN = "#5cb8d6";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RhythmStream({ shots, films }: RhythmStreamProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [selectedFilmId, setSelectedFilmId] = useState<string>(
    films[0]?.id ?? "",
  );

  /* Derive data for the selected film -------------------------------- */

  const filmShots = useMemo(
    () =>
      shots
        .filter((s) => s.filmId === selectedFilmId)
        .sort((a, b) => a.shotIndex - b.shotIndex),
    [shots, selectedFilmId],
  );

  const framingKeys = useMemo(() => {
    const set = new Set<string>();
    filmShots.forEach((s) => set.add(s.framing));
    return Array.from(set).sort();
  }, [filmShots]);

  /* Scene boundary indices ------------------------------------------- */

  const sceneBoundaries = useMemo(() => {
    const boundaries: number[] = [];
    for (let i = 1; i < filmShots.length; i++) {
      if (filmShots[i].sceneNumber !== filmShots[i - 1].sceneNumber) {
        boundaries.push(i);
      }
    }
    return boundaries;
  }, [filmShots]);

  /* D3 render -------------------------------------------------------- */

  const render = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || filmShots.length === 0) return;

    const { width: W } = container.getBoundingClientRect();
    const H = Math.min(320, Math.max(200, W * 0.35));
    const margin = { top: 12, right: 16, bottom: 28, left: 40 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    /* Build tabular data: one row per shotIndex, one column per key */
    const tableData = filmShots.map((s, i) => {
      const row: Record<string, number> = { index: i };
      framingKeys.forEach((k) => {
        row[k] = s.framing === k ? s.duration : 0;
      });
      return row;
    });

    /* Stack */
    const stack = d3
      .stack<Record<string, number>>()
      .keys(framingKeys)
      .order(d3.stackOrderInsideOut)
      .offset(d3.stackOffsetWiggle);

    const series = stack(tableData);

    /* Scales */
    const x = d3
      .scaleLinear()
      .domain([0, filmShots.length - 1])
      .range([0, w]);

    const yExtent = d3.extent(series.flat(2)) as [number, number];
    const y = d3.scaleLinear().domain(yExtent).range([h, 0]);

    /* Area generator */
    const area = d3
      .area<d3.SeriesPoint<Record<string, number>>>()
      .x((d) => x(d.data.index))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveMonotoneX);

    /* Clear & setup */
    const sel = d3.select(svg);
    sel.selectAll("*").remove();
    sel.attr("width", W).attr("height", H);

    const g = sel
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    /* Scene boundaries */
    sceneBoundaries.forEach((idx) => {
      g.append("line")
        .attr("x1", x(idx))
        .attr("x2", x(idx))
        .attr("y1", 0)
        .attr("y2", h)
        .attr("stroke", TERTIARY)
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", "3 3")
        .attr("opacity", 0.6);
    });

    /* Stream layers */
    g.selectAll("path.stream-layer")
      .data(series)
      .join("path")
      .attr("class", "stream-layer")
      .attr("d", area)
      .attr("fill", (d) => colorForFraming(d.key))
      .attr("fill-opacity", 0.72)
      .attr("stroke", (d) => colorForFraming(d.key))
      .attr("stroke-width", 0.4)
      .attr("stroke-opacity", 0.4)
      .on("mouseenter", function () {
        d3.select(this).attr("fill-opacity", 0.95);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("fill-opacity", 0.72);
      });

    /* Hover overlay (invisible rects per shot index) */
    const tooltip = tooltipRef.current;
    const colW = w / filmShots.length;

    g.selectAll("rect.hover-col")
      .data(filmShots)
      .join("rect")
      .attr("class", "hover-col")
      .attr("x", (_, i) => x(i) - colW / 2)
      .attr("y", 0)
      .attr("width", colW)
      .attr("height", h)
      .attr("fill", "transparent")
      .on("mouseenter", (event, d) => {
        if (!tooltip) return;
        tooltip.style.opacity = "1";
        tooltip.innerHTML = `
          <div style="font-weight:600;color:${TEXT}">${d.framing.replace(/_/g, " ")}</div>
          <div style="color:${SECONDARY}">Shot ${d.shotIndex}${d.sceneNumber != null ? ` · Scene ${d.sceneNumber}` : ""}</div>
          <div style="color:${SECONDARY}">Duration: ${d.duration.toFixed(1)}s · ${d.shotSize}</div>
          ${d.description ? `<div style="color:${TERTIARY};margin-top:2px;font-size:9px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.description}</div>` : ""}
        `;
      })
      .on("mousemove", (event) => {
        if (!tooltip || !container) return;
        const bounds = container.getBoundingClientRect();
        const px = event.clientX - bounds.left;
        const py = event.clientY - bounds.top;
        tooltip.style.left = `${px + 12}px`;
        tooltip.style.top = `${py - 8}px`;
      })
      .on("mouseleave", () => {
        if (tooltip) tooltip.style.opacity = "0";
      });

    /* X axis */
    const xAxis = d3
      .axisBottom(x)
      .ticks(Math.min(filmShots.length, 10))
      .tickFormat((d) => `${d}`);

    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(xAxis)
      .call((g) => g.select(".domain").attr("stroke", TERTIARY))
      .call((g) =>
        g
          .selectAll(".tick text")
          .attr("fill", SECONDARY)
          .attr("font-size", "9px")
          .attr("font-family", "ui-monospace, monospace"),
      )
      .call((g) =>
        g.selectAll(".tick line").attr("stroke", TERTIARY).attr("opacity", 0.4),
      );
  }, [filmShots, framingKeys, sceneBoundaries]);

  /* Resize observer -------------------------------------------------- */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    render();

    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [render]);

  /* ------------------------------------------------------------------ */
  /*  JSX                                                                */
  /* ------------------------------------------------------------------ */

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        background: BG,
        border: `1px solid ${TERTIARY}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px 4px",
        }}
      >
        <span
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: CYAN,
          }}
        >
          Framing over time
        </span>

        {/* Film selector */}
        <select
          value={selectedFilmId}
          onChange={(e) => setSelectedFilmId(e.target.value)}
          style={{
            background: BG,
            color: TEXT,
            border: `1px solid ${TERTIARY}`,
            borderRadius: 4,
            padding: "2px 6px",
            fontFamily: "ui-monospace, monospace",
            fontSize: 10,
            outline: "none",
            cursor: "pointer",
          }}
        >
          {films.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
      </div>

      {/* SVG */}
      <svg ref={svgRef} style={{ display: "block", width: "100%" }} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 120ms ease",
          background: "rgba(13,13,18,0.92)",
          border: `1px solid ${TERTIARY}`,
          borderRadius: 6,
          padding: "6px 10px",
          fontFamily: "ui-monospace, monospace",
          fontSize: 10,
          lineHeight: 1.45,
          color: TEXT,
          zIndex: 10,
          backdropFilter: "blur(6px)",
        }}
      />
    </div>
  );
}
