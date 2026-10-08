import React from 'react';
import { SummaryMetrics, AlertThresholds } from '../types';
import { formatNumberBR, formatPercentBR } from '../utils/calculations';
import { AlertTriangle, BellRing } from 'lucide-react';

interface KpiCardsProps {
  metrics: SummaryMetrics;
  isPresentationMode?: boolean;
  alertThresholds?: AlertThresholds;
  onOpenAlertSettings?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  metrics,
  isPresentationMode = false,
  alertThresholds = { criticalLossPct: 15, warningLossPct: 10 },
  onOpenAlertSettings,
}) => {
  const isCriticalLoss = metrics.perdaPct >= alertThresholds.criticalLossPct;
  const isWarningLoss = !isCriticalLoss && metrics.perdaPct >= alertThresholds.warningLossPct;

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-3 ${
        isPresentationMode ? 'gap-4 sm:gap-6 mb-8' : 'gap-3 sm:gap-4 mb-6'
      }`}
    >
      {/* 1. PRODUÇÃO TOTAL — ENFORNA */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-[#1c1b19] border ${
          isPresentationMode ? 'p-6 sm:p-7 border-[#3a3935] shadow-lg' : 'p-5 border-[#2e2d2a] shadow-xs'
        }`}
      >
        <div className={`absolute top-0 left-0 right-0 ${isPresentationMode ? 'h-1.5' : 'h-1'} bg-[#38bdf8]`} />
        <div
          className={`${
            isPresentationMode ? 'text-xs sm:text-sm font-black' : 'text-[11px] font-bold'
          } uppercase tracking-wider text-[#9e988f] mb-2`}
        >
          PRODUÇÃO TOTAL — ENFORNA
        </div>
        <div
          className={`${
            isPresentationMode
              ? 'text-3xl sm:text-4xl lg:text-5xl font-black'
              : 'text-2xl sm:text-3xl font-extrabold'
          } text-[#f4efe6] font-mono tabular-nums tracking-tight`}
        >
          {formatNumberBR(metrics.totalEnforna)}
        </div>
        <div className={`mt-2 ${isPresentationMode ? 'text-sm sm:text-base font-medium' : 'text-xs sm:text-sm'} text-[#9e988f]`}>
          {formatNumberBR(metrics.camarasCount)} câmaras enfornadas
        </div>
      </div>

      {/* 2. PRODUÇÃO TOTAL — DESENFORNA */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-[#1c1b19] border ${
          isPresentationMode ? 'p-6 sm:p-7 border-[#3a3935] shadow-lg' : 'p-5 border-[#2e2d2a] shadow-xs'
        }`}
      >
        <div className={`absolute top-0 left-0 right-0 ${isPresentationMode ? 'h-1.5' : 'h-1'} bg-[#fb923c]`} />
        <div
          className={`${
            isPresentationMode ? 'text-xs sm:text-sm font-black' : 'text-[11px] font-bold'
          } uppercase tracking-wider text-[#9e988f] mb-2`}
        >
          PRODUÇÃO TOTAL — DESENFORNA
        </div>
        <div
          className={`${
            isPresentationMode
              ? 'text-3xl sm:text-4xl lg:text-5xl font-black'
              : 'text-2xl sm:text-3xl font-extrabold'
          } text-[#f4efe6] font-mono tabular-nums tracking-tight`}
        >
          {formatNumberBR(metrics.totalDesenforna)}
        </div>
        <div className={`mt-2 ${isPresentationMode ? 'text-sm sm:text-base font-semibold' : 'text-xs sm:text-sm'} text-[#fb923c] font-medium`}>
          {formatPercentBR(metrics.eficienciaPct)} da enforna
        </div>
      </div>

      {/* 3. PERDAS TOTAIS (com Alerta Visual de Limite) */}
      <div
        className={`relative overflow-hidden rounded-2xl transition-all duration-300 border ${
          isCriticalLoss
            ? 'bg-[#291313] border-[#ef4444] shadow-[0_0_25px_rgba(239,68,68,0.22)] ring-2 ring-[#ef4444]/60'
            : isWarningLoss
            ? 'bg-[#241a12] border-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.18)] ring-1 ring-[#f59e0b]/50'
            : 'bg-[#1c1b19] border-[#2e2d2a] shadow-xs'
        } ${isPresentationMode ? 'p-6 sm:p-7' : 'p-5'}`}
      >
        <div
          className={`absolute top-0 left-0 right-0 ${isPresentationMode ? 'h-1.5' : 'h-1'} ${
            isCriticalLoss ? 'bg-[#ef4444] animate-pulse' : isWarningLoss ? 'bg-[#f59e0b]' : 'bg-[#f87171]'
          }`}
        />

        <div className="flex items-center justify-between gap-2 mb-2">
          <div
            className={`${
              isPresentationMode ? 'text-xs sm:text-sm font-black' : 'text-[11px] font-bold'
            } uppercase tracking-wider ${
              isCriticalLoss ? 'text-[#fca5a5]' : isWarningLoss ? 'text-[#fcd34d]' : 'text-[#9e988f]'
            }`}
          >
            PERDAS TOTAIS
          </div>

          {/* Alert Threshold Pill */}
          {onOpenAlertSettings && (
            <button
              type="button"
              onClick={onOpenAlertSettings}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                isCriticalLoss
                  ? 'bg-[#ef4444]/30 text-[#fca5a5] border border-[#ef4444]/60 animate-pulse hover:bg-[#ef4444]/40'
                  : isWarningLoss
                  ? 'bg-[#f59e0b]/25 text-[#fde68a] border border-[#f59e0b]/50 hover:bg-[#f59e0b]/35'
                  : 'bg-[#282724] text-[#a8a29e] hover:text-[#f4efe6] border border-[#393733]'
              }`}
              title="Configurar Alertas de Limite"
            >
              {isCriticalLoss ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-[#ef4444] shrink-0" />
                  <span>Alerta: &gt;{alertThresholds.criticalLossPct}%</span>
                </>
              ) : isWarningLoss ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0" />
                  <span>Atenção: &ge;{alertThresholds.warningLossPct}%</span>
                </>
              ) : (
                <>
                  <BellRing className="w-2.5 h-2.5 text-[#8c867e] shrink-0" />
                  <span>Limiar: {alertThresholds.criticalLossPct}%</span>
                </>
              )}
            </button>
          )}
        </div>

        <div
          className={`${
            isPresentationMode
              ? 'text-3xl sm:text-4xl lg:text-5xl font-black'
              : 'text-2xl sm:text-3xl font-extrabold'
          } ${isCriticalLoss ? 'text-[#fca5a5]' : 'text-[#f87171]'} font-mono tabular-nums tracking-tight`}
        >
          {formatNumberBR(metrics.totalPerdas)}
        </div>

        <div
          className={`mt-2 flex flex-wrap items-center gap-2 ${
            isPresentationMode ? 'text-sm sm:text-base font-semibold' : 'text-xs sm:text-sm'
          } ${isCriticalLoss ? 'text-[#fca5a5]' : isWarningLoss ? 'text-[#fde68a]' : 'text-[#f87171]'}`}
        >
          <span>{formatPercentBR(metrics.perdaPct)} da enforna</span>
          {isCriticalLoss && (
            <span className="inline-block px-1.5 py-0.2 rounded-xs bg-[#ef4444]/30 font-bold text-[10px] sm:text-xs text-[#fee2e2]">
              Acima do Limite Máximo
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

