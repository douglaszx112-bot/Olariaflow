import React, { useState } from 'react';
import { DailySummary } from '../types';
import { formatDateBR, formatNumberBR, formatPercentBR } from '../utils/calculations';

interface ProductionDailyChartProps {
  data: DailySummary[];
  scopeLabel: string;
}

export const ProductionDailyChart: React.FC<ProductionDailyChartProps> = ({
  data,
  scopeLabel,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-[#1c1b19] border border-[#2e2d2a] shadow-xs mb-6 text-center text-[#8c867e] text-sm">
        Nenhum dado encontrado para o período selecionado.
      </div>
    );
  }

  // Find max value to calibrate Y-axis
  const maxVal = Math.max(...data.map((d) => Math.max(d.enforna, d.desenforna)), 1000);
  // Round up to nice 300k scale if near 300k
  const yMax = Math.ceil(maxVal / 50000) * 50000;
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  const formatY = (val: number) => {
    if (val === 0) return '0';
    if (val >= 1000) return `${Math.round(val / 1000)} mil`;
    return `${val}`;
  };

  const chartHeight = 200;

  return (
    <div className="p-5 rounded-2xl bg-[#1c1b19] border border-[#2e2d2a] shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#f4efe6]">
            Enforna × Desenforna por dia
          </h2>
          <p className="text-xs text-[#9e988f] mt-0.5">{scopeLabel}</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#38bdf8]" />
            <span className="text-[#ded8ce]">Enforna</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#fb923c]" />
            <span className="text-[#ded8ce]">Desenforna</span>
          </div>
        </div>
      </div>

      {/* Main Chart Graphic */}
      <div className="relative pt-4">
        <div className="flex">
          {/* Y Axis Labels */}
          <div
            className="flex flex-col justify-between text-[10px] text-[#78736b] pr-2 text-right w-12 sm:w-14 shrink-0 font-mono"
            style={{ height: `${chartHeight}px` }}
          >
            {[...yTicks].reverse().map((t) => (
              <span key={t}>{formatY(t)}</span>
            ))}
          </div>

          {/* Chart Canvas Area */}
          <div className="relative flex-1 overflow-x-auto">
            <div
              className="relative min-w-[500px]"
              style={{ height: `${chartHeight}px` }}
            >
              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {yTicks.map((t) => (
                  <div key={t} className="w-full border-b border-[#282724]" />
                ))}
              </div>

              {/* Grouped Bars */}
              <div className="absolute inset-0 flex items-end justify-between px-1">
                {data.map((item, idx) => {
                  const hEnf = yMax > 0 ? (item.enforna / yMax) * chartHeight : 0;
                  const hDes = yMax > 0 ? (item.desenforna / yMax) * chartHeight : 0;
                  const isHovered = hoveredIndex === idx;

                  return (
                    <div
                      key={item.date}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className="group flex-1 flex items-end justify-center gap-0.5 sm:gap-1 h-full px-0.5 relative cursor-pointer"
                    >
                      {/* Bar Enforna */}
                      <div
                        style={{ height: `${Math.max(2, hEnf)}px` }}
                        className={`w-1.5 sm:w-2.5 md:w-3.5 bg-[#38bdf8] rounded-t-xs transition-all ${
                          isHovered ? 'brightness-125' : 'group-hover:brightness-110'
                        }`}
                      />
                      {/* Bar Desenforna */}
                      <div
                        style={{ height: `${Math.max(2, hDes)}px` }}
                        className={`w-1.5 sm:w-2.5 md:w-3.5 bg-[#fb923c] rounded-t-xs transition-all ${
                          isHovered ? 'brightness-125' : 'group-hover:brightness-110'
                        }`}
                      />

                      {/* Tooltip */}
                      {isHovered && (
                        <div className="absolute bottom-[105%] left-1/2 -translate-x-1/2 z-20 whitespace-nowrap bg-[#121110] border border-[#3e3c37] p-2.5 rounded-lg shadow-xl text-left pointer-events-none">
                          <div className="text-[11px] font-bold text-[#f4efe6] mb-1">
                            {formatDateBR(item.date)} ({item.camaras} câmaras)
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                            <span className="text-[#a8a29e]">Enforna:</span>
                            <span className="font-mono font-bold text-[#f4efe6]">
                              {formatNumberBR(item.enforna)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full bg-[#fb923c]" />
                            <span className="text-[#a8a29e]">Desenforna:</span>
                            <span className="font-mono font-bold text-[#f4efe6]">
                              {formatNumberBR(item.desenforna)}
                            </span>
                          </div>
                          <div className="mt-1 pt-1 border-t border-[#2a2926] text-[11px] text-[#9e988f]">
                            Eficiência:{' '}
                            <span className="text-[#fb923c] font-semibold">
                              {formatPercentBR(
                                item.enforna > 0 ? (item.desenforna / item.enforna) * 100 : 0
                              )}
                            </span>
                            {' · '}
                            Saldo: {formatNumberBR(item.enforna - item.desenforna)} pcs
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-Axis Date Labels */}
            <div className="flex justify-between pt-2 px-1 min-w-[500px] border-t border-[#2a2926] text-[9px] sm:text-[10px] text-[#78736b] font-mono">
              {data.map((d, i) => {
                // Show every 2nd or 3rd label on small screens
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
