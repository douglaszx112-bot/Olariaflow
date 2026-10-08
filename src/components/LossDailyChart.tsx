import React, { useState } from 'react';
import { DailySummary } from '../types';
import { formatDateBR, formatPercentBR, formatNumberBR } from '../utils/calculations';

interface LossDailyChartProps {
  data: DailySummary[];
  averageLossPct: number;
  scopeLabel: string;
}

export const LossDailyChart: React.FC<LossDailyChartProps> = ({
  data,
  averageLossPct,
  scopeLabel,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return null;
  }

  // Determine max percentage for scale (minimum 8% as shown in screenshots)
  const maxPctValue = Math.max(8.0, ...data.map((d) => d.perdaPct * 1.15));
  const yTicks = [0, 2, 4, 6, 8].filter((t) => t <= maxPctValue);

  const chartHeight = 160;
  const chartWidth = 600;

  // Calculate coordinates for SVG line
  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * (chartWidth - 40) + 20 : chartWidth / 2;
    const y = chartHeight - (d.perdaPct / maxPctValue) * chartHeight;
    return { x, y, data: d };
  });

  const pathD = points.length > 0
    ? `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`
    : '';

  // Average line Y coordinate
  const avgY = chartHeight - (averageLossPct / maxPctValue) * chartHeight;

  return (
    <div className="p-5 rounded-2xl bg-[#1c1b19] border border-[#2e2d2a] shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#f4efe6]">
            % de perda por dia
          </h2>
          <p className="text-xs text-[#9e988f] mt-0.5">
            {scopeLabel} · perdas ÷ enforna do dia
          </p>
        </div>

        {/* Legend / Info */}
        <div className="flex items-center gap-3 text-xs text-[#ded8ce]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f87171]" />
            <span>Taxa diária</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dashed border-[#8c867e]" />
            <span className="text-[#a8a29e]">Média ({formatPercentBR(averageLossPct)})</span>
          </div>
        </div>
      </div>

      <div className="relative pt-2">
        <div className="flex">
          {/* Y Axis Labels */}
          <div
            className="flex flex-col justify-between text-[10px] text-[#78736b] pr-2 text-right w-10 sm:w-12 shrink-0 font-mono"
            style={{ height: `${chartHeight}px` }}
          >
            {[...yTicks].reverse().map((t) => (
              <span key={t}>{t},0%</span>
            ))}
          </div>

          {/* SVG Line Canvas */}
          <div className="relative flex-1 overflow-x-auto">
            <div className="relative min-w-[500px]" style={{ height: `${chartHeight}px` }}>
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Horizontal Grid lines */}
                {yTicks.map((t) => {
                  const yPos = chartHeight - (t / maxPctValue) * chartHeight;
                  return (
                    <line
                      key={t}
                      x1="0"
                      y1={yPos}
                      x2={chartWidth}
                      y2={yPos}
                      stroke="#282724"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Average Reference Line (Dashed) */}
                {avgY >= 0 && avgY <= chartHeight && (
                  <g>
                    <line
                      x1="0"
                      y1={avgY}
                      x2={chartWidth}
                      y2={avgY}
                      stroke="#78736b"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={chartWidth - 5}
                      y={avgY - 4}
                      fill="#a8a29e"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      média {formatPercentBR(averageLossPct)}
                    </text>
                  </g>
                )}

                {/* Loss Line Path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#f87171"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {points.map((p, idx) => {
                  const isHovered = hoveredIdx === idx;
                  return (
                    <g key={p.data.date}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 6 : 3.5}
                        fill="#1c1b19"
                        stroke="#f87171"
                        strokeWidth={isHovered ? 3 : 2}
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredIdx !== null && points[hoveredIdx] && (
                <div
                  className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-[#121110] border border-[#3e3c37] p-2.5 rounded-lg shadow-xl whitespace-nowrap text-left"
                  style={{
                    left: `${(points[hoveredIdx].x / chartWidth) * 100}%`,
                    top: `${points[hoveredIdx].y - 10}px`,
                  }}
                >
                  <div className="text-[11px] font-bold text-[#f4efe6] mb-1">
                    {formatDateBR(points[hoveredIdx].data.date)}
                  </div>
                  <div className="text-xs text-[#f87171] font-mono font-bold">
                    Perda: {formatPercentBR(points[hoveredIdx].data.perdaPct)}
                  </div>
                  <div className="text-[11px] text-[#b0aba2] mt-0.5">
                    {formatNumberBR(points[hoveredIdx].data.perda)} peças perdidas /{' '}
                    {formatNumberBR(points[hoveredIdx].data.enforna)} enfornadas
                  </div>
                </div>
              )}
            </div>

            {/* X-Axis Dates */}
            <div className="flex justify-between pt-2 min-w-[500px] border-t border-[#2a2926] text-[9px] sm:text-[10px] text-[#78736b] font-mono">
              {data.map((d, i) => {
                const show = i % 2 === 0 || i === data.length - 1;
                return (
                  <span
                    key={d.date}
                    className={`text-center ${show ? 'opacity-100' : 'opacity-0'}`}
                  >
                    {d.formattedDate}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
