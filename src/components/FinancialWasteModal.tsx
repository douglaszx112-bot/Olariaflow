import React, { useState } from 'react';
import { X, DollarSign, TrendingDown, Sparkles } from 'lucide-react';
import { SummaryMetrics } from '../types';
import { formatCurrencyBRL, formatNumberBR, formatPercentBR } from '../utils/calculations';

interface FinancialWasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: SummaryMetrics;
}

export const FinancialWasteModal: React.FC<FinancialWasteModalProps> = ({
  isOpen,
  onClose,
  metrics,
}) => {
  const [costPerTile, setCostPerTile] = useState<number>(1.20);
  const [priceGrade1, setPriceGrade1] = useState<number>(2.50);
  const [priceGrade2, setPriceGrade2] = useState<number>(1.40);

  if (!isOpen) return null;

  // Waste calculations
  // Severe loss = Trinca + Crua + Quebra (thrown away or crushed)
  const severeLossPieces = metrics.perdaTrinca + metrics.perdaCrua + metrics.perdaQuebra;
  const severeDirectCost = severeLossPieces * costPerTile;

  // Grade 2 discount loss = (priceGrade1 - priceGrade2) * perda2Grau
  const grade2Loss = metrics.perda2Grau * Math.max(0, priceGrade1 - priceGrade2);

  // Total Revenue Lost
  const totalRevenueLost = (severeLossPieces * priceGrade1) + grade2Loss;

  // Opportunity simulation: What if Trinca is reduced by 1% of total enforna?
  const trincaSavingsPieces = Math.round(metrics.totalEnforna * 0.01);
  const trincaSavingsMoney = trincaSavingsPieces * priceGrade1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-xl p-6 rounded-2xl bg-[#1c1b19] border border-[#393733] shadow-2xl text-[#f4efe6]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2e2d2a] mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#fb923c]/15 text-[#fb923c]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Simulador Financeiro de Desperdício</h3>
              <p className="text-xs text-[#9e988f]">
                Converta peças perdidas em prejuízo real e potencial de lucro
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#8c867e] hover:text-[#f4efe6] hover:bg-[#282724] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-[#242320] border border-[#33312e]">
            <label className="block text-[11px] font-semibold text-[#8c867e] uppercase mb-1">
              Custo Produção (R$)
            </label>
            <div className="flex items-center">
              <span className="text-xs text-[#8c867e] mr-1">R$</span>
              <input
                type="number"
                step="0.05"
                min="0"
                value={costPerTile}
                onChange={(e) => setCostPerTile(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono text-base font-bold text-[#f4efe6] focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#242320] border border-[#33312e]">
            <label className="block text-[11px] font-semibold text-[#8c867e] uppercase mb-1">
              Preço Venda 1ª (R$)
            </label>
            <div className="flex items-center">
              <span className="text-xs text-[#8c867e] mr-1">R$</span>
              <input
                type="number"
                step="0.10"
                min="0"
                value={priceGrade1}
                onChange={(e) => setPriceGrade1(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono text-base font-bold text-[#f4efe6] focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#242320] border border-[#33312e]">
            <label className="block text-[11px] font-semibold text-[#8c867e] uppercase mb-1">
              Preço Venda 2ª (R$)
            </label>
            <div className="flex items-center">
              <span className="text-xs text-[#8c867e] mr-1">R$</span>
              <input
                type="number"
                step="0.10"
                min="0"
                value={priceGrade2}
                onChange={(e) => setPriceGrade2(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono text-base font-bold text-[#f4efe6] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="space-y-3 mb-5">
          {/* Direct Production Cost Lost */}
          <div className="p-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/25 flex items-center justify-between">
            <div>
              <div className="text-xs text-[#f87171] font-semibold flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                Custo Direto Desperdiçado (Trinca + Crua + Quebra)
              </div>
              <div className="text-[11px] text-[#b0aba2] mt-0.5">
                {formatNumberBR(severeLossPieces)} peças descartadas × {formatCurrencyBRL(costPerTile)}
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-[#f87171]">
              {formatCurrencyBRL(severeDirectCost)}
            </div>
          </div>

          {/* Revenue Opportunity Loss */}
          <div className="p-4 rounded-xl bg-[#242320] border border-[#33312e] flex items-center justify-between">
            <div>
              <div className="text-xs text-[#ded8ce] font-semibold">
                Faturamento Bruto Deixado de Ganhar
              </div>
              <div className="text-[11px] text-[#8c867e] mt-0.5">
                Receita perdida se as peças fossem vendidas como 1ª linha
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-[#fb923c]">
              {formatCurrencyBRL(totalRevenueLost)}
            </div>
          </div>

          {/* Improvement Potential Card */}
          <div className="p-4 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/25">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#4ade80] font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Meta de Economia: Redução de 1,0% na Trinca
                </div>
                <div className="text-[11px] text-[#b0aba2] mt-0.5">
                  Recuperação estimada de {formatNumberBR(trincaSavingsPieces)} telhas úteis no período
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-[#4ade80]">
                +{formatCurrencyBRL(trincaSavingsMoney)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#f4efe6] border border-[#393733]"
          >
            Fechar Simulador
          </button>
        </div>
      </div>
    </div>
  );
};
