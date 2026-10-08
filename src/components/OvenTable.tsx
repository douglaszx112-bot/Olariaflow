import React from 'react';
import { OvenSummary } from '../types';
import { formatNumberBR, formatPercentBR } from '../utils/calculations';

interface OvenTableProps {
  ovens: OvenSummary[];
  selectedOven: string;
  onSelectOven: (oven: string) => void;
}

export const OvenTable: React.FC<OvenTableProps> = ({
  ovens,
  selectedOven,
  onSelectOven,
}) => {
  // Compute overall total
  const totals = ovens.reduce(
    (acc, o) => {
      acc.camaras += o.camaras;
      acc.enforna += o.enforna;
      acc.desenforna += o.desenforna;
      acc.perda += o.perda;
      return acc;
    },
    { camaras: 0, enforna: 0, desenforna: 0, perda: 0 }
  );

  const totalPerdaPct = totals.enforna > 0 ? (totals.perda / totals.enforna) * 100 : 0;

  return (
    <div className="p-5 rounded-2xl bg-[#1c1b19] border border-[#2e2d2a] shadow-xs mb-6">
      <div className="mb-4">
        <h2 className="text-base sm:text-lg font-bold text-[#f4efe6]">
          Resultado por forno
        </h2>
        <p className="text-xs text-[#9e988f] mt-0.5">
          Mostra todos os fornos no período selecionado. Clique em uma linha para filtrar.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[#2e2d2a] text-[#8c867e] text-[11px] font-bold uppercase tracking-wider">
              <th className="pb-3 pr-4 font-semibold">FORNO</th>
              <th className="pb-3 px-3 text-right font-semibold">CÂMARAS</th>
              <th className="pb-3 px-3 text-right font-semibold">ENFORNA</th>
              <th className="pb-3 px-3 text-right font-semibold">DESENFORNA</th>
              <th className="pb-3 px-3 text-right font-semibold">PERDA</th>
              <th className="pb-3 pl-3 text-right font-semibold">% PERDA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#282724]">
            {ovens.map((o) => {
              const isSelected = selectedOven === o.forno;
              return (
                <tr
                  key={o.forno}
                  onClick={() => onSelectOven(isSelected ? 'all' : o.forno)}
                  className={`cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'bg-[#c85a2b]/15 text-[#f4efe6] font-medium'
                      : 'hover:bg-[#252421] text-[#ded8ce]'
                  }`}
                  title={`Clique para ${isSelected ? 'remover filtro de' : 'filtrar por'} ${o.forno}`}
                >
                  <td className="py-3 pr-4 font-medium flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-[#c85a2b]' : 'bg-[#54514b]'
                      }`}
                    />
                    <span>{o.forno}</span>
                    {isSelected && (
                      <span className="text-[10px] text-[#fb923c] font-normal uppercase tracking-wider ml-1">
                        (ativo)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-[#b0aba2]">
                    {o.camaras}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-[#f4efe6]">
                    {formatNumberBR(o.enforna)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-[#f4efe6]">
                    {formatNumberBR(o.desenforna)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-[#f87171]">
                    {formatNumberBR(o.perda)}
                  </td>
                  <td className="py-3 pl-3 text-right font-mono tabular-nums font-semibold text-[#f87171]">
                    {formatPercentBR(o.perdaPct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#393733] font-bold text-[#f4efe6] text-xs sm:text-sm">
              <td className="pt-3 pr-4">Total geral</td>
              <td className="pt-3 px-3 text-right font-mono tabular-nums text-[#b0aba2]">
                {totals.camaras}
              </td>
              <td className="pt-3 px-3 text-right font-mono tabular-nums">
                {formatNumberBR(totals.enforna)}
              </td>
              <td className="pt-3 px-3 text-right font-mono tabular-nums">
                {formatNumberBR(totals.desenforna)}
              </td>
              <td className="pt-3 px-3 text-right font-mono tabular-nums text-[#f87171]">
                {formatNumberBR(totals.perda)}
              </td>
              <td className="pt-3 pl-3 text-right font-mono tabular-nums text-[#f87171]">
                {formatPercentBR(totalPerdaPct)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
