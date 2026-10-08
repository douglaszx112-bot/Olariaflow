import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  BellRing,
  ShieldCheck,
  Lock,
  RotateCcw,
  Check,
  Sliders,
} from 'lucide-react';
import { AlertThresholds, ChamberRecord } from '../types';
import { formatPercentBR, formatNumberBR } from '../utils/calculations';

interface ThresholdAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds: AlertThresholds;
  onSaveThresholds: (thresholds: AlertThresholds) => void;
  isAdmin: boolean;
  onOpenAdminAuth: () => void;
  records: ChamberRecord[];
}

export const ThresholdAlertsModal: React.FC<ThresholdAlertsModalProps> = ({
  isOpen,
  onClose,
  thresholds,
  onSaveThresholds,
  isAdmin,
  onOpenAdminAuth,
  records,
}) => {
  const [criticalPct, setCriticalPct] = useState<number>(thresholds.criticalLossPct);
  const [warningPct, setWarningPct] = useState<number>(thresholds.warningLossPct);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setCriticalPct(thresholds.criticalLossPct);
      setWarningPct(thresholds.warningLossPct);
      setValidationError(null);
    }
  }, [isOpen, thresholds]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Real-time calculation of chambers affected by proposed thresholds
  const totalChambers = records.length;
  let criticalCount = 0;
  let warningCount = 0;

  for (const r of records) {
    const loss = r.perda_2grau + r.perda_crua + r.perda_trinca + r.perda_quebra;
    const pct = r.enforna > 0 ? (loss / r.enforna) * 100 : 0;
    if (pct >= criticalPct) {
      criticalCount++;
    } else if (pct >= warningPct) {
      warningCount++;
    }
  }

  const criticalChamberPct = totalChambers > 0 ? (criticalCount / totalChambers) * 100 : 0;
  const warningChamberPct = totalChambers > 0 ? (warningCount / totalChambers) * 100 : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (isNaN(criticalPct) || criticalPct <= 0 || criticalPct > 100) {
      setValidationError('O limiar crítico deve ser um valor percentual válido entre 1% e 100%.');
      return;
    }

    if (isNaN(warningPct) || warningPct <= 0 || warningPct > 100) {
      setValidationError('O limiar de atenção deve ser um valor percentual válido entre 1% e 100%.');
      return;
    }

    if (warningPct >= criticalPct) {
      setValidationError('O limiar de atenção (amarelo) deve ser menor que o limiar crítico (vermelho).');
      return;
    }

    onSaveThresholds({
      criticalLossPct: Number(criticalPct.toFixed(1)),
      warningLossPct: Number(warningPct.toFixed(1)),
    });
    onClose();
  };

  const handleResetDefaults = () => {
    setCriticalPct(15);
    setWarningPct(10);
    setValidationError(null);
  };

  const PRESET_CRITICAL = [8, 10, 12, 15, 18, 20];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-xl rounded-2xl bg-[#1c1b19] border border-[#393733] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2e2d2a] bg-[#171614]">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30">
              <BellRing className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#f4efe6]">
                Alertas de Limite de Perda
              </h2>
              <p className="text-xs text-[#9e988f]">
                Defina referências para acender alertas visuais e sinalizar desvios na produção
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8c867e] hover:text-[#f4efe6] hover:bg-[#282724] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Admin Role Status Notice */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isAdmin
                ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#ded8ce]'
                : 'bg-[#ea580c]/10 border-[#ea580c]/30 text-[#ded8ce]'
            }`}
          >
            {isAdmin ? (
              <ShieldCheck className="w-5 h-5 text-[#4ade80] shrink-0 mt-0.5" />
            ) : (
              <Lock className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              {isAdmin ? (
                <span>
                  <strong className="text-[#f4efe6]">Modo Administrador Ativo:</strong> Você pode ajustar os
                  limiares de tolerância de queima. As alterações são refletidas instantaneamente nos cartões de KPI
                  e na tabela de anomalias.
                </span>
              ) : (
                <div className="space-y-2">
                  <span>
                    <strong className="text-[#f4efe6]">Modo Visualizador:</strong> Apenas o Administrador pode
                    alterar os limiares de referência da fábrica. Os valores abaixo representam as metas ativas configuradas.
                  </span>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAdminAuth();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#ea580c] hover:bg-[#c85a2b] text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Entrar como Administrador</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Primary Setting: Critical Loss Threshold */}
          <div className="p-4 rounded-xl bg-[#141312] border border-[#2e2d2a] space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="criticalPct" className="text-sm font-bold text-[#f4efe6] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-ping" />
                <span>Limiar Crítico de Perda (%)</span>
              </label>
              <div className="flex items-center gap-1 font-mono text-base font-extrabold text-[#f87171]">
                <span>{criticalPct}%</span>
              </div>
            </div>

            <p className="text-xs text-[#9e988f]">
              Acende o alerta vermelho pulsante no cartão de Perdas Totais (KPI) e destaca com alta prioridade as câmaras que ultrapassarem esta taxa.
            </p>

            <div className="flex items-center gap-4">
              <input
                id="criticalPctRange"
                type="range"
                min="5"
                max="35"
                step="0.5"
                disabled={!isAdmin}
                value={criticalPct}
                onChange={(e) => {
                  setCriticalPct(parseFloat(e.target.value));
                  setValidationError(null);
                }}
                className="w-full accent-[#ef4444] cursor-pointer disabled:opacity-50"
              />
              <input
                id="criticalPct"
                type="number"
                min="1"
                max="100"
                step="0.1"
                disabled={!isAdmin}
                value={criticalPct}
                onChange={(e) => {
                  setCriticalPct(parseFloat(e.target.value) || 0);
                  setValidationError(null);
                }}
                className="w-20 px-2.5 py-1.5 rounded-lg bg-[#22211e] border border-[#3a3935] text-center font-mono font-bold text-sm text-[#f4efe6] focus:border-[#ef4444] focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Presets */}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-[#8c867e] uppercase font-bold mr-1">Atalhos:</span>
                {PRESET_CRITICAL.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setCriticalPct(val);
                      setValidationError(null);
                    }}
                    className={`px-2 py-0.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                      criticalPct === val
                        ? 'bg-[#ef4444] text-white border-[#ef4444]'
                        : 'bg-[#22211e] hover:bg-[#2e2d2a] text-[#ded8ce] border-[#383632]'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Secondary Setting: Warning Threshold (Atenção / Amarelo) */}
          <div className="p-4 rounded-xl bg-[#141312] border border-[#2e2d2a] space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="warningPct" className="text-sm font-bold text-[#f4efe6] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <span>Limiar de Atenção Preventiva (%)</span>
              </label>
              <div className="flex items-center gap-1 font-mono text-base font-extrabold text-[#fbbf24]">
                <span>{warningPct}%</span>
              </div>
            </div>

            <p className="text-xs text-[#9e988f]">
              Sinaliza em amarelo as câmaras que estão se aproximando da faixa de perigo, servindo de aviso prévio para os operadores do forno.
            </p>

            <div className="flex items-center gap-4">
              <input
                id="warningPctRange"
                type="range"
                min="3"
                max={Math.max(4, criticalPct - 0.5)}
                step="0.5"
                disabled={!isAdmin}
                value={warningPct}
                onChange={(e) => {
                  setWarningPct(parseFloat(e.target.value));
                  setValidationError(null);
                }}
                className="w-full accent-[#f59e0b] cursor-pointer disabled:opacity-50"
              />
              <input
                id="warningPct"
                type="number"
                min="1"
                max="99"
                step="0.1"
                disabled={!isAdmin}
                value={warningPct}
                onChange={(e) => {
                  setWarningPct(parseFloat(e.target.value) || 0);
                  setValidationError(null);
                }}
                className="w-20 px-2.5 py-1.5 rounded-lg bg-[#22211e] border border-[#3a3935] text-center font-mono font-bold text-sm text-[#f4efe6] focus:border-[#f59e0b] focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Impact preview */}
          <div className="p-4 rounded-xl bg-[#22211e] border border-[#33312e] space-y-2.5">
            <div className="text-[11px] uppercase font-bold tracking-wider text-[#9e988f] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Impacto com a base de dados carregada ({formatNumberBR(totalChambers)} câmaras):</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-[#171614] border border-[#2e2d2a]">
                <div className="text-[#f87171] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Em Alerta Crítico (&ge; {criticalPct}%):</span>
                </div>
                <div className="font-mono text-lg font-black text-[#f4efe6] mt-1">
                  {criticalCount}{' '}
                  <span className="text-xs font-normal text-[#9e988f]">
                    ({formatPercentBR(criticalChamberPct, 1)})
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#171614] border border-[#2e2d2a]">
                <div className="text-[#fbbf24] font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                  <span>Em Atenção (&ge; {warningPct}%):</span>
                </div>
                <div className="font-mono text-lg font-black text-[#f4efe6] mt-1">
                  {warningCount}{' '}
                  <span className="text-xs font-normal text-[#9e988f]">
                    ({formatPercentBR(warningChamberPct, 1)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#2e2d2a]">
            {isAdmin ? (
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 text-xs text-[#a8a29e] hover:text-[#f4efe6] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão (15% / 10%)</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#ded8ce] border border-[#393733] transition-colors cursor-pointer"
              >
                {isAdmin ? 'Cancelar' : 'Fechar'}
              </button>

              {isAdmin && (
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-[#ea580c] hover:bg-[#c85a2b] text-white shadow-md transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Limiares</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
