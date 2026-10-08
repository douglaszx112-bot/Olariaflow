import React from 'react';
import { X, Flame, AlertCircle, Package } from 'lucide-react';
import { ChamberRecord } from '../types';
import { formatDateBR, formatNumberBR, formatPercentBR } from '../utils/calculations';

interface ChamberDetailModalProps {
  chamber: ChamberRecord | null;
  onClose: () => void;
}

export const ChamberDetailModal: React.FC<ChamberDetailModalProps> = ({
  chamber,
  onClose,
}) => {
  if (!chamber) return null;

  const totalLoss =
    chamber.perda_2grau +
    chamber.perda_crua +
    chamber.perda_trinca +
    chamber.perda_quebra;

  const lossPct = chamber.enforna > 0 ? (totalLoss / chamber.enforna) * 100 : 0;
  const efPct = chamber.enforna > 0 ? (chamber.desenforna / chamber.enforna) * 100 : 0;

  // Breakdown percentages over total loss
  const pctOfLoss = (val: number) => (totalLoss > 0 ? (val / totalLoss) * 100 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg p-6 rounded-2xl bg-[#1c1b19] border border-[#393733] shadow-2xl text-[#f4efe6]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2e2d2a] mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#c85a2b]/15 text-[#fb923c]">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {chamber.forno} — Câmara {chamber.camara}
              </h3>
              <p className="text-xs text-[#9e988f]">
                Registro de queima do dia {formatDateBR(chamber.data)}
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

        {/* Highlight KPI summary */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 text-center">
          <div className="p-3 rounded-xl bg-[#242320] border border-[#2e2d2a]">
            <div className="text-[10px] text-[#8c867e] uppercase font-semibold">Enforna</div>
            <div className="text-base sm:text-lg font-bold font-mono text-[#f4efe6] mt-0.5">
              {formatNumberBR(chamber.enforna)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#242320] border border-[#2e2d2a]">
            <div className="text-[10px] text-[#8c867e] uppercase font-semibold">Desenforna</div>
            <div className="text-base sm:text-lg font-bold font-mono text-[#fb923c] mt-0.5">
              {formatNumberBR(chamber.desenforna)}
            </div>
            <div className="text-[10px] text-[#fb923c]">{formatPercentBR(efPct)}</div>
          </div>

          <div className="p-3 rounded-xl bg-[#242320] border border-[#2e2d2a]">
            <div className="text-[10px] text-[#8c867e] uppercase font-semibold">Perdas Totais</div>
            <div className="text-base sm:text-lg font-bold font-mono text-[#f87171] mt-0.5">
              {formatNumberBR(totalLoss)}
            </div>
            <div className="text-[10px] text-[#f87171]">{formatPercentBR(lossPct)}</div>
          </div>
        </div>

        {/* Diferença de estoque (peça +/-) — Ajuste de estoque / reconciliação física (NÃO é perda de produção) */}
        {chamber.diferenca !== undefined && chamber.diferenca !== null && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#242320] border border-[#33312e] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                <Package className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-[#f4efe6]">
                  Diferença de estoque (peça +/-)
                </span>
                <p className="text-[11px] text-[#8c867e]">
                  Ajuste de estoque / reconciliação física da câmara (não é perda de produção)
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-sm sm:text-base font-bold font-mono px-2 py-0.5 rounded-md ${
                  chamber.diferenca > 0
                    ? 'text-[#4ade80] bg-[#22c55e]/15 border border-[#22c55e]/30'
                    : chamber.diferenca < 0
                    ? 'text-[#f87171] bg-[#ef4444]/15 border border-[#ef4444]/30'
                    : 'text-[#ded8ce] bg-[#33312e]'
                }`}
              >
                {chamber.diferenca > 0
                  ? `+${formatNumberBR(chamber.diferenca)}`
                  : formatNumberBR(chamber.diferenca)}{' '}
                peças
              </span>
            </div>
          </div>
        )}

        {/* Loss breakdown */}
        <div className="space-y-3 mb-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8c867e]">
            Composição das Perdas da Câmara
          </div>

          {/* Trinca */}
          <div className="p-3 rounded-xl bg-[#242320] border-l-4 border-l-[#f87171] border border-[#2e2d2a] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#f4efe6]">Trinca</span>
              <div className="text-[11px] text-[#8c867e]">
                {formatPercentBR(pctOfLoss(chamber.perda_trinca), 0)} de todas as perdas desta câmara
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold font-mono text-[#f87171]">
                {formatNumberBR(chamber.perda_trinca)} peças
              </div>
              <div className="text-[10px] text-[#8c867e]">
                {formatPercentBR((chamber.perda_trinca / chamber.enforna) * 100, 2)} da enforna
              </div>
            </div>
          </div>

          {/* 2ª Linha */}
          <div className="p-3 rounded-xl bg-[#242320] border-l-4 border-l-[#eab308] border border-[#2e2d2a] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#f4efe6]">2ª (segunda)</span>
              <div className="text-[11px] text-[#8c867e]">
                {formatPercentBR(pctOfLoss(chamber.perda_2grau), 0)} das perdas
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold font-mono text-[#eab308]">
                {formatNumberBR(chamber.perda_2grau)} peças
              </div>
              <div className="text-[10px] text-[#8c867e]">
                {formatPercentBR((chamber.perda_2grau / chamber.enforna) * 100, 2)} da enforna
              </div>
            </div>
          </div>

          {/* Crua */}
          <div className="p-3 rounded-xl bg-[#242320] border-l-4 border-l-[#60a5fa] border border-[#2e2d2a] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#f4efe6]">Crua</span>
              <div className="text-[11px] text-[#8c867e]">
                {formatPercentBR(pctOfLoss(chamber.perda_crua), 0)} das perdas
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold font-mono text-[#60a5fa]">
                {formatNumberBR(chamber.perda_crua)} peças
              </div>
              <div className="text-[10px] text-[#8c867e]">
                {formatPercentBR((chamber.perda_crua / chamber.enforna) * 100, 2)} da enforna
              </div>
            </div>
          </div>

          {/* Quebra */}
          <div className="p-3 rounded-xl bg-[#242320] border-l-4 border-l-[#b45309] border border-[#2e2d2a] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#f4efe6]">Quebra</span>
              <div className="text-[11px] text-[#8c867e]">
                {formatPercentBR(pctOfLoss(chamber.perda_quebra), 0)} das perdas
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold font-mono text-[#fb923c]">
                {formatNumberBR(chamber.perda_quebra)} peças
              </div>
              <div className="text-[10px] text-[#8c867e]">
                {formatPercentBR((chamber.perda_quebra / chamber.enforna) * 100, 2)} da enforna
              </div>
            </div>
          </div>
        </div>

        {/* Root cause diagnostic note */}
        {lossPct >= 10 && (
          <div className="p-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/25 flex items-start gap-2 text-xs text-[#f87171] mb-5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Alerta Operacional:</strong> Esta câmara registrou {formatPercentBR(lossPct)} de perda,
              muito acima da média geral da fábrica (4,4%). Recomenda-se checagem da curva térmica de queima e posicionamento dos queimadores deste forno.
            </div>
          </div>
        )}

        <div className="text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#f4efe6] border border-[#393733]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
