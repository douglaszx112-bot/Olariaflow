import React, { useState } from 'react';
import { OvenSummary } from '../types';
import { formatNumberBR, formatPercentBR } from '../utils/calculations';

interface LossByOvenChartProps {
  ovens: OvenSummary[];
  onSelectOven?: (oven: string) => void;
  selectedOven?: string;
}

export const LossByOvenChart: React.FC<LossByOvenChartProps> = ({
  ovens,
  onSelectOven,
  selectedOven,
}) => {
  const [hoveredOven, setHoveredOven] = useState<OvenSummary | null>(null);

  // Maximum % value for scaling (usually max around 8% like in Screenshot 2)
  const maxPct = Math.max(8.0, ...ovens.map((o) => o.perdaPct * 1.15));

  const ticks = [0, 2, 4, 6, 8].filter((t) => t <= maxPct + 1);

  return (
    <div className="p-5 rounded-2xl bg-[#1c1b19] border border-[#2e2d2a] shadow-xs mb-6">
      <div className="mb-4">
        <h2 className="text-base sm:text-lg font-bold text-[#f4efe6]">
          % de perda por forno
        </h2>
        <p className="text-xs text-[#9e988f] mt-0.5">
          Composição da perda sobre a enforna do forno
        </p>
      </div>

      <div className="space-y-4 py-2">
        {ovens.map((o) => {
          const isSelected = selectedOven === o.forno;
          const p2a = o.perda2GrauPctEnf;
          const pCrua = o.perdaCruaPctEnf;
          const pTrinca = o.perdaTrincaPctEnf;
          const pQuebra = o.perdaQuebraPctEnf;

          // Width as percentage of chart area
          const w2a = (p2a / maxPct) * 100;
          const wCrua = (pCrua / maxPct) * 100;
          const wTrinca = (pTrinca / maxPct) * 100;
          const wQuebra = (pQuebra / maxPct) * 100;

          return (
            <div
              key={o.forno}
              onMouseEnter={() => setHoveredOven(o)}
              onMouseLeave={() => setHoveredOven(null)}
              onClick={() => onSelectOven && onSelectOven(isSelected ? 'all' : o.forno)}
              className={`group cursor-pointer p-1.5 rounded-lg transition-colors ${
                isSelected ? 'bg-[#c85a2b]/15' : 'hover:bg-[#252421]'
              }`}
            >
              <div className="flex items-center text-xs">
                <span className="w-16 sm:w-20 text-[#b0aba2] font-medium shrink-0 group-hover:text-[#f4efe6]">
                  {o.forno}
                </span>

                <div className="relative flex-1 h-5 sm:h-6 bg-[#262522] rounded-xs overflow-hidden flex items-center">
                  {/* Stacked Segments */}
                  <div
                    style={{ width: `${w2a}%` }}
                    className="h-full bg-[#eab308] hover:opacity-90 transition-all"
                    title={`2ª: ${formatPercentBR(p2a, 2)} (${formatNumberBR(o.perda2Grau)} pcs)`}
                  />
                  <div
                    style={{ width: `${wCrua}%` }}
                    className="h-full bg-[#60a5fa] hover:opacity-90 transition-all"
                    title={`Crua: ${formatPercentBR(pCrua, 2)} (${formatNumberBR(o.perdaCrua)} pcs)`}
                  />
                  <div
                    style={{ width: `${wTrinca}%` }}
                    className="h-full bg-[#f87171] hover:opacity-90 transition-all"
                    title={`Trinca: ${formatPercentBR(pTrinca, 2)} (${formatNumberBR(o.perdaTrinca)} pcs)`}
                  />
                  <div
                    style={{ width: `${wQuebra}%` }}
                    className="h-full bg-[#b45309] hover:opacity-90 transition-all"
                    title={`Quebra: ${formatPercentBR(pQuebra, 2)} (${formatNumberBR(o.perdaQuebra)} pcs)`}
                  />
                </div>

                <span className="w-14 sm:w-16 text-right font-mono tabular-nums text-xs font-semibold text-[#ded8ce] shrink-0 pl-2">
                  {formatPercentBR(o.perdaPct, 1)}
                </span>
              </div>
            </div>
          );
        })}

        {/* X Axis scale */}
        <div className="flex items-center text-[10px] text-[#78736b] pt-2 border-t border-[#282724]">
          <span className="w-16 sm:w-20 shrink-0" />
          <div className="flex-1 flex justify-between px-1">
            {ticks.map((t) => (
              <span key={t}>{t}%</span>
            ))}
          </div>
          <span className="w-14 sm:w-16 shrink-0" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-3 text-xs text-[#b0aba2]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#eab308]" />
          <span>2ª</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#60a5fa]" />
          <span>Crua</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#f87171]" />
          <span>Trinca</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#b45309]" />
          <span>Quebra</span>
        </div>

        {hoveredOven && (
          <div className="ml-auto text-xs text-[#f4efe6] bg-[#282724] px-2.5 py-1 rounded-md border border-[#383632]">
            {hoveredOven.forno}: {formatNumberBR(hoveredOven.perda)} peças perdidas (
            {formatPercentBR(hoveredOven.perdaPct)}) de {formatNumberBR(hoveredOven.enforna)} enfornadas
          </div>
        )}
      </div>
    </div>
  );
};
