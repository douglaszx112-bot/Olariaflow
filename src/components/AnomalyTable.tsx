import React, { useState } from 'react';
import { ChamberRecord, LossCategory, AlertThresholds } from '../types';
import { formatDateShortBR, formatNumberBR, formatPercentBR } from '../utils/calculations';
import { ArrowUpDown, AlertTriangle, Eye, Sliders, Filter } from 'lucide-react';

interface AnomalyTableProps {
  records: ChamberRecord[];
  scopeLabel: string;
  perdaTipo: LossCategory;
  onSelectChamber: (chamber: ChamberRecord) => void;
  alertThresholds?: AlertThresholds;
  onOpenAlertSettings?: () => void;
}

export const AnomalyTable: React.FC<AnomalyTableProps> = ({
  records,
  scopeLabel,
  perdaTipo,
  onSelectChamber,
  alertThresholds = { criticalLossPct: 15, warningLossPct: 10 },
  onOpenAlertSettings,
}) => {
  const [sortBy, setSortBy] = useState<'pieces' | 'percent'>('pieces');
  const [limit, setLimit] = useState<number>(8);
  const [filterOnlyAlerts, setFilterOnlyAlerts] = useState<boolean>(false);

  const criticalThreshold = alertThresholds.criticalLossPct;
  const warningThreshold = alertThresholds.warningLossPct;

  // Compute losses for each record
  const annotated = records.map((r) => {
    let lossVal = r.perda_2grau + r.perda_crua + r.perda_trinca + r.perda_quebra;
    if (perdaTipo === '2a') lossVal = r.perda_2grau;
    else if (perdaTipo === 'crua') lossVal = r.perda_crua;
    else if (perdaTipo === 'trinca') lossVal = r.perda_trinca;
    else if (perdaTipo === 'quebra') lossVal = r.perda_quebra;

    const lossPct = r.enforna > 0 ? (lossVal / r.enforna) * 100 : 0;
    return {
      record: r,
      lossVal,
      lossPct,
      isCritical: lossPct >= criticalThreshold,
      isWarning: lossPct >= warningThreshold && lossPct < criticalThreshold,
    };
  });

  const criticalCount = annotated.filter((a) => a.isCritical).length;

  // Filter if only alerts requested
  const filtered = filterOnlyAlerts ? annotated.filter((a) => a.isCritical || a.isWarning) : annotated;

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'pieces') {
      return b.lossVal - a.lossVal;
    }
    return b.lossPct - a.lossPct;
  });

  const displayed = limit > 0 ? filtered.slice(0, limit) : filtered;

  return (
    <div className="p-5 rounded-2xl bg-[#1c1b19] border border-[#2e2d2a] shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <AlertTriangle className="w-4 h-4 text-[#f87171]" />
            <h2 className="text-base sm:text-lg font-bold text-[#f4efe6]">
              Câmaras com maior perda
            </h2>
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ef4444]/20 text-[#fca5a5] border border-[#ef4444]/40 text-xs font-bold animate-pulse">
                <span>{criticalCount} acima de {criticalThreshold}%</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#9e988f] mt-0.5">
            {scopeLabel} · {limit > 0 ? `${limit} câmaras exibidas` : 'Todas as câmaras'} em{' '}
            {sortBy === 'pieces' ? 'peças' : '% de perda'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* Quick Alert Filter Toggle */}
          {criticalCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterOnlyAlerts(!filterOnlyAlerts)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                filterOnlyAlerts
                  ? 'bg-[#ef4444] text-white border-[#ef4444]'
                  : 'bg-[#272623] hover:bg-[#34332f] text-[#fca5a5] border-[#ef4444]/40 hover:border-[#ef4444]'
              }`}
              title="Filtrar apenas câmaras que ultrapassaram os limites de perda"
            >
              <Filter className="w-3 h-3" />
              <span>{filterOnlyAlerts ? 'Ver Todas' : `Apenas Alertas (${criticalCount})`}</span>
            </button>
          )}

          {/* Configure Thresholds Button */}
          {onOpenAlertSettings && (
            <button
              type="button"
              onClick={onOpenAlertSettings}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-[#272623] hover:bg-[#34332f] text-[#ded8ce] border border-[#383632] hover:border-[#ef4444]/50 transition-colors cursor-pointer"
              title="Configurar limites de alerta para perdas percentuais"
            >
              <Sliders className="w-3 h-3 text-[#f87171]" />
              <span>Limiar: &gt; {criticalThreshold}%</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSortBy(sortBy === 'pieces' ? 'percent' : 'pieces')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-[#272623] hover:bg-[#34332f] text-[#ded8ce] border border-[#383632] transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3 h-3 text-[#fb923c]" />
            <span>Ordenar: {sortBy === 'pieces' ? 'Peças' : '% Perda'}</span>
          </button>

          <button
            type="button"
            onClick={() => setLimit(limit === 8 ? 20 : limit === 20 ? 0 : 8)}
            className="px-2.5 py-1 text-xs rounded-lg bg-[#272623] hover:bg-[#34332f] text-[#ded8ce] border border-[#383632] transition-colors cursor-pointer"
          >
            {limit === 8 ? 'Top 20' : limit === 20 ? 'Ver Todas' : 'Top 8'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[#2e2d2a] text-[#8c867e] text-[11px] font-bold uppercase tracking-wider">
              <th className="pb-3 pr-3 font-semibold">FORNO</th>
              <th className="pb-3 px-3 font-semibold">DATA</th>
              <th className="pb-3 px-3 text-center font-semibold">CÂMARA</th>
              <th className="pb-3 px-3 text-right font-semibold">ENFORNA</th>
              <th className="pb-3 px-3 text-right font-semibold">PERDA</th>
              <th className="pb-3 px-3 text-right font-semibold">% PERDA</th>
              <th className="pb-3 pl-2 text-center font-semibold no-print">DETALHE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#282724]">
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-[#8c867e] text-xs">
                  {filterOnlyAlerts
                    ? 'Nenhuma câmara excede os limiares de alerta configurados.'
                    : 'Nenhuma câmara encontrada para os critérios selecionados.'}
                </td>
              </tr>
            ) : (
              displayed.map(({ record, lossVal, lossPct, isCritical, isWarning }) => {
                return (
                  <tr
                    key={record.id}
                    onClick={() => onSelectChamber(record)}
                    className={`cursor-pointer transition-colors ${
                      isCritical
                        ? 'bg-[#291313]/35 hover:bg-[#291313]/60 border-l-4 border-l-[#ef4444]'
                        : isWarning
                        ? 'bg-[#241a12]/25 hover:bg-[#241a12]/50 border-l-2 border-l-[#f59e0b]'
                        : 'hover:bg-[#252421]'
                    }`}
                  >
                    <td className="py-3 pr-3 pl-2 font-medium text-[#f4efe6]">
                      <div className="flex items-center gap-1.5">
                        {isCritical && (
                          <span title={`Alerta Crítico: > ${criticalThreshold}%`}>
                            <AlertTriangle className="w-3.5 h-3.5 text-[#f87171] shrink-0" />
                          </span>
                        )}
                        <span>{record.forno}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#b0aba2]">
                      {formatDateShortBR(record.data)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-[#ded8ce]">
                      {record.camara}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[#b0aba2]">
                      {formatNumberBR(record.enforna)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-[#f87171]">
                      {formatNumberBR(lossVal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[#ef4444]/25 text-[#fca5a5] border border-[#ef4444]/50 shadow-xs">
                          <AlertTriangle className="w-3 h-3 text-[#f87171] shrink-0" />
                          <span>{formatPercentBR(lossPct, 1)}</span>
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-[#f59e0b]/20 text-[#fde68a] border border-[#f59e0b]/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0" />
                          <span>{formatPercentBR(lossPct, 1)}</span>
                        </span>
                      ) : (
                        <span className="text-[#f87171]">
                          {formatPercentBR(lossPct, 1)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-2 text-center text-[#8c867e] no-print">
                      <Eye className="w-3.5 h-3.5 mx-auto hover:text-[#f4efe6] transition-colors" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Explanatory Footer Note */}
      <div className="mt-6 pt-4 border-t border-[#282724] text-xs text-[#8c867e] leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <strong className="text-[#b0aba2]">Limiares ativos:</strong> Crítico: &ge;{' '}
          <span className="text-[#f87171] font-bold">{criticalThreshold}%</span> · Atenção: &ge;{' '}
          <span className="text-[#fbbf24] font-bold">{warningThreshold}%</span>. Percentuais calculados sobre a enforna.
        </div>
        {onOpenAlertSettings && (
          <button
            type="button"
            onClick={onOpenAlertSettings}
            className="text-xs text-[#ea580c] hover:underline cursor-pointer"
          >
            Ajustar limites de referência &rarr;
          </button>
        )}
      </div>
    </div>
  );
};
