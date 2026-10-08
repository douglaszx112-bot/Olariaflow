import React from 'react';
import { LossCategory, SummaryMetrics } from '../types';
import { formatNumberBR, formatPercentBR } from '../utils/calculations';

interface LossTypeCardsProps {
  metrics: SummaryMetrics;
  selectedCategory: LossCategory;
  onSelectCategory: (cat: LossCategory) => void;
  scopeLabel: string;
}

export const LossTypeCards: React.FC<LossTypeCardsProps> = ({
  metrics,
  selectedCategory,
  onSelectCategory,
  scopeLabel,
}) => {
  const totalPerdas = metrics.totalPerdas;

  const cards: Array<{
    id: LossCategory;
    title: string;
    count: number;
    pctEnf: number;
    pctLosses: number;
    borderColor: string;
    activeBg: string;
    tagColor: string;
  }> = [
    {
      id: '2a',
      title: '2ª (segunda)',
      count: metrics.perda2Grau,
      pctEnf: metrics.perda2GrauPct,
      pctLosses: totalPerdas > 0 ? (metrics.perda2Grau / totalPerdas) * 100 : 0,
      borderColor: 'border-l-[#eab308]',
      activeBg: 'ring-1 ring-[#eab308]/60 bg-[#eab308]/5',
      tagColor: 'text-[#eab308]',
    },
    {
      id: 'crua',
      title: 'Crua',
      count: metrics.perdaCrua,
      pctEnf: metrics.perdaCruaPct,
      pctLosses: totalPerdas > 0 ? (metrics.perdaCrua / totalPerdas) * 100 : 0,
      borderColor: 'border-l-[#60a5fa]',
      activeBg: 'ring-1 ring-[#60a5fa]/60 bg-[#60a5fa]/5',
      tagColor: 'text-[#60a5fa]',
    },
    {
      id: 'trinca',
      title: 'Trinca',
      count: metrics.perdaTrinca,
      pctEnf: metrics.perdaTrincaPct,
      pctLosses: totalPerdas > 0 ? (metrics.perdaTrinca / totalPerdas) * 100 : 0,
      borderColor: 'border-l-[#f87171]',
      activeBg: 'ring-1 ring-[#f87171]/60 bg-[#f87171]/5',
      tagColor: 'text-[#f87171]',
    },
    {
      id: 'quebra',
      title: 'Quebra',
      count: metrics.perdaQuebra,
      pctEnf: metrics.perdaQuebraPct,
      pctLosses: totalPerdas > 0 ? (metrics.perdaQuebra / totalPerdas) * 100 : 0,
      borderColor: 'border-l-[#b45309]',
      activeBg: 'ring-1 ring-[#b45309]/60 bg-[#b45309]/5',
      tagColor: 'text-[#fb923c]',
    },
  ];

  return (
    <div className="p-5 rounded-2xl bg-[#1c1b19] border border-[#2e2d2a] shadow-xs mb-6">
      <div className="mb-4">
        <h2 className="text-base sm:text-lg font-bold text-[#f4efe6]">
          Perdas por tipo
        </h2>
        <p className="text-xs text-[#9e988f] mt-0.5">
          {scopeLabel} · peças, % sobre a enforna e % sobre o total de perdas
        </p>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
        {cards.map((card) => {
          const isSelected = selectedCategory === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectCategory(isSelected ? 'all' : card.id)}
              className={`text-left p-4 rounded-xl bg-[#242320] border-l-4 ${card.borderColor} border border-[#2e2d2a] transition-all hover:bg-[#2c2b27] ${
                isSelected ? card.activeBg : ''
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#f4efe6]">
                  {formatNumberBR(card.count)}
                </span>
                <span className={`text-xs font-semibold ${card.tagColor}`}>
                  {formatPercentBR(card.pctEnf, 2)} da enforna
                </span>
              </div>
              <div className="text-xs text-[#b0aba2] font-medium mt-1">
                {card.title}
              </div>
              <div className="text-[11px] text-[#8c867e] mt-1 flex items-center justify-between border-t border-[#2d2c28] pt-1.5">
                <span>Participação nas perdas:</span>
                <span className="font-semibold text-[#ded8ce]">
                  {formatPercentBR(card.pctLosses, 1)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Maior Causa Highlight Banner */}
      <div className="py-2.5 px-4 rounded-xl bg-[#242320] border border-[#2e2d2a] text-xs sm:text-sm text-[#ded8ce] flex items-center justify-between">
        <div>
          Maior causa:{' '}
          <strong className="text-[#f4efe6] font-semibold">
            {metrics.maiorCausaNome} ({formatPercentBR(metrics.maiorCausaPct, 0)} das perdas)
          </strong>
        </div>
        <div className="text-[11px] text-[#8c867e]">
          Total de perdas:{' '}
          <span className="font-mono font-bold text-[#f87171]">
            {formatNumberBR(metrics.totalPerdas)}
          </span>{' '}
          ({formatPercentBR(metrics.perdaPct, 1)})
        </div>
      </div>
    </div>
  );
};
