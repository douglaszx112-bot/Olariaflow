import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Flame,
  FileSpreadsheet,
  FileDown,
  Loader2,
  ShieldCheck,
  Lock,
  Tv,
  Minimize2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCw,
  BellRing,
} from 'lucide-react';
import { formatDateBR } from '../utils/calculations';
import { MonthOption, AutoRefreshOption, AlertThresholds } from '../types';

interface HeaderProps {
  fornoFilter: string;
  startDate: string;
  endDate: string;
  onExportPdf: () => void;
  isExportingPdf?: boolean;
  onOpenFinancial: () => void;
  onOpenImport: () => void;
  onOpenShareSync: () => void;
  isAdmin: boolean;
  onOpenAdminAuth: () => void;
  cloudSyncStatus?: 'synced' | 'local';
  isPresentationMode?: boolean;
  onTogglePresentationMode?: () => void;
  availableMonths?: MonthOption[];
  selectedMonth?: string;
  onSelectMonth?: (monthKey: string) => void;
  autoRefreshInterval?: AutoRefreshOption;
  onSetAutoRefreshInterval?: (interval: AutoRefreshOption) => void;
  isSyncing?: boolean;
  onManualRefresh?: () => void;
  alertThresholds?: AlertThresholds;
  onOpenAlertSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  fornoFilter,
  startDate,
  endDate,
  onExportPdf,
  isExportingPdf = false,
  onOpenFinancial,
  onOpenImport,
  onOpenShareSync,
  isAdmin,
  onOpenAdminAuth,
  cloudSyncStatus = 'synced',
  isPresentationMode = false,
  onTogglePresentationMode,
  availableMonths = [],
  selectedMonth = 'all',
  onSelectMonth,
  autoRefreshInterval = '1min',
  onSetAutoRefreshInterval,
  isSyncing = false,
  onManualRefresh,
  alertThresholds = { criticalLossPct: 15, warningLossPct: 10 },
  onOpenAlertSettings,
}) => {
  const scopeText = fornoFilter === 'all' ? 'Todos os fornos' : fornoFilter;
  const dateRangeText =
    startDate && endDate
      ? `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
      : 'Aguardando planilha';

  const currentMonthIndex = availableMonths.findIndex((m) => m.monthKey === selectedMonth);
  const hasPrevMonth = currentMonthIndex < availableMonths.length - 1; // latest first
  const hasNextMonth = currentMonthIndex > 0;

  const handlePrevMonth = () => {
    if (currentMonthIndex === -1 && availableMonths.length > 0) {
      onSelectMonth?.(availableMonths[0].monthKey);
    } else if (hasPrevMonth) {
      onSelectMonth?.(availableMonths[currentMonthIndex + 1].monthKey);
    }
  };

  const handleNextMonth = () => {
    if (hasNextMonth) {
      onSelectMonth?.(availableMonths[currentMonthIndex - 1].monthKey);
    }
  };

  const [currentTime, setCurrentTime] = useState<string>(() =>
    new Date().toLocaleTimeString('pt-BR')
  );
  const [currentDate, setCurrentDate] = useState<string>(() =>
    new Date().toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  );

  useEffect(() => {
    if (!isPresentationMode) return;
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR'));
      setCurrentDate(
        now.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [isPresentationMode]);

  // SPECIALIZED PRESENTATION / FACTORY TV HEADER
  if (isPresentationMode) {
    return (
      <header className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#1c1b19] border border-[#393733] shadow-xl no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Brand & Plant Scope */}
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/40 shadow-sm shrink-0">
              <Flame className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[#f4efe6]">
                  Painel de Queima — Monitor Industrial
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                  Modo TV
                </span>
              </div>
              <div className="text-xs text-[#9e988f] flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-[#ded8ce]">{scopeText}</span>
                <span>•</span>
                <span>{dateRangeText}</span>
              </div>
            </div>
          </div>

          {/* Center: Live Clock & Live Indicator & Month Navigator */}
          <div className="flex flex-wrap items-center gap-3">
            {availableMonths.length > 0 && (
              <div className="flex items-center gap-1 bg-[#141312] border border-[#2e2d2a] px-2 py-1.5 rounded-xl">
                <button
                  type="button"
                  disabled={!hasPrevMonth}
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg bg-[#22211e] hover:bg-[#2e2d2a] disabled:opacity-20 text-[#a8a29e] hover:text-[#f4efe6] transition-colors cursor-pointer"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <select
                  value={selectedMonth}
                  onChange={(e) => onSelectMonth?.(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#f4efe6] px-1.5 py-0.5 focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#1c1b19] text-[#f4efe6]">
                    Todos os Meses (Consolidado)
                  </option>
                  {availableMonths.map((m) => (
                    <option key={m.monthKey} value={m.monthKey} className="bg-[#1c1b19] text-[#f4efe6]">
                      {m.label} ({m.count} câmaras)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!hasNextMonth}
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg bg-[#22211e] hover:bg-[#2e2d2a] disabled:opacity-20 text-[#a8a29e] hover:text-[#f4efe6] transition-colors cursor-pointer"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Auto-refresh control in presentation mode */}
            <div
              className="flex items-center gap-1.5 bg-[#141312] border border-[#2e2d2a] px-2.5 py-1.5 rounded-xl shadow-xs"
              title="Intervalo de auto-refresh dos dados da nuvem"
            >
              <button
                type="button"
                onClick={onManualRefresh}
                disabled={isSyncing}
                className="p-1 rounded-lg hover:bg-[#22211e] text-[#a8a29e] hover:text-[#f4efe6] transition-colors cursor-pointer"
                title="Sincronizar dados agora"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#ea580c]' : ''}`} />
              </button>
              <span className="text-[10px] uppercase font-bold text-[#8c867e]">
                Auto:
              </span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => onSetAutoRefreshInterval?.(e.target.value as AutoRefreshOption)}
                className="bg-transparent text-xs font-bold text-[#f4efe6] focus:outline-none cursor-pointer"
                aria-label="Intervalo de auto-refresh no modo TV"
              >
                <option value="30s" className="bg-[#1c1b19] text-[#f4efe6]">30s</option>
                <option value="1min" className="bg-[#1c1b19] text-[#f4efe6]">1 min</option>
                <option value="5min" className="bg-[#1c1b19] text-[#f4efe6]">5 min</option>
                <option value="off" className="bg-[#1c1b19] text-[#9e988f]">Desativado</option>
              </select>
              {autoRefreshInterval !== 'off' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" title="Auto-refresh ativo" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-[#6b7280]" title="Auto-refresh desativado" />
              )}
            </div>

            {/* Alert Thresholds pill in presentation mode */}
            {onOpenAlertSettings && (
              <button
                type="button"
                onClick={onOpenAlertSettings}
                className="flex items-center gap-1.5 bg-[#141312] hover:bg-[#22211e] border border-[#2e2d2a] px-2.5 py-1.5 rounded-xl shadow-xs text-xs text-[#ded8ce] transition-colors cursor-pointer"
                title="Configurar limites de alerta de perdas"
              >
                <BellRing className="w-3.5 h-3.5 text-[#f87171]" />
                <span className="font-bold text-[#f4efe6]">Limiar: {alertThresholds.criticalLossPct}%</span>
              </button>
            )}

            <div className="flex items-center gap-4 bg-[#141312] border border-[#2e2d2a] px-4 py-2 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] animate-ping" />
                <span className="text-xs font-bold text-[#4ade80] uppercase tracking-wider">
                  Ao Vivo
                </span>
              </div>
              <div className="h-4 w-px bg-[#33312e]" />
              <div className="flex items-center gap-2 font-mono text-xs sm:text-sm text-[#f4efe6]">
                <Clock className="w-4 h-4 text-[#ea580c]" />
                <span className="font-bold">{currentTime}</span>
                <span className="text-[#8c867e] hidden sm:inline">| {currentDate}</span>
              </div>
            </div>
          </div>

          {/* Right: Exit Presentation Button */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#8c867e]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
              <span>Sincronização Contínua</span>
            </div>
            <button
              type="button"
              onClick={onTogglePresentationMode}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#f4efe6] border border-[#44423d] shadow-sm transition-all cursor-pointer hover:border-[#ea580c]/50"
              title="Sair do Modo Apresentação (Pressione Esc)"
            >
              <Minimize2 className="w-4 h-4 text-[#ea580c]" />
              <span>Sair da Apresentação</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#171614] text-[#8c867e] border border-[#33312e]">
                ESC
              </kbd>
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="mb-6">
      {/* Top Branding Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2926]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#ea580c]/15 text-[#ea580c] border border-[#ea580c]/30">
              <Flame className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f4efe6]">
              Telha Canal — Enforna × Desenforna
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#9e988f]">
            <span>
              {scopeText} · {dateRangeText}
            </span>
            <span className="hidden sm:inline text-[#3a3935]">·</span>
            {isAdmin ? (
              <button
                type="button"
                onClick={onOpenShareSync}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4ade80] bg-[#22c55e]/10 hover:bg-[#22c55e]/20 border border-[#22c55e]/30 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                title="Gerenciar compartilhamento com a equipe"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                <span>Sincronizado na Nuvem</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4ade80] bg-[#22c55e]/10 border border-[#22c55e]/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                <span>Sincronizado na Nuvem</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2 no-print">
          {/* Month Switcher in Header */}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-1 bg-[#1c1b19] border border-[#383632] px-1.5 py-1 rounded-xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#8c867e] px-1 hidden md:inline">
                Mês:
              </span>
              <button
                type="button"
                disabled={!hasPrevMonth}
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-[#282724] disabled:opacity-20 text-[#a8a29e] hover:text-[#f4efe6] transition-colors cursor-pointer"
                title="Mês anterior no histórico"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => onSelectMonth?.(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#f4efe6] px-1 py-0.5 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#1c1b19] text-[#f4efe6]">
                  Todos os Meses (Consolidado)
                </option>
                {availableMonths.map((m) => (
                  <option key={m.monthKey} value={m.monthKey} className="bg-[#1c1b19] text-[#f4efe6]">
                    {m.label} ({m.count} câmaras)
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!hasNextMonth}
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-[#282724] disabled:opacity-20 text-[#a8a29e] hover:text-[#f4efe6] transition-colors cursor-pointer"
                title="Próximo mês no histórico"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Auto-refresh Control */}
          <div
            className="flex items-center gap-1.5 bg-[#1c1b19] border border-[#383632] px-2 py-1 rounded-xl shadow-xs"
            title="Auto-refresh: define o intervalo de sincronização automática com a nuvem (30s, 1min, 5min ou desativado)"
          >
            <button
              type="button"
              onClick={onManualRefresh}
              disabled={isSyncing}
              className="p-1 rounded-lg hover:bg-[#282724] text-[#a8a29e] hover:text-[#f4efe6] transition-colors cursor-pointer"
              title="Sincronizar agora com a nuvem"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#ea580c]' : ''}`} />
            </button>
            <span className="text-[10px] uppercase font-bold text-[#8c867e] hidden md:inline">
              Auto:
            </span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => onSetAutoRefreshInterval?.(e.target.value as AutoRefreshOption)}
              className="bg-transparent text-xs font-semibold text-[#f4efe6] pr-1 py-0.5 focus:outline-none cursor-pointer"
              aria-label="Intervalo de auto-refresh com a nuvem"
            >
              <option value="30s" className="bg-[#1c1b19] text-[#f4efe6]">30s</option>
              <option value="1min" className="bg-[#1c1b19] text-[#f4efe6]">1 min</option>
              <option value="5min" className="bg-[#1c1b19] text-[#f4efe6]">5 min</option>
              <option value="off" className="bg-[#1c1b19] text-[#9e988f]">Desativado</option>
            </select>
            {autoRefreshInterval !== 'off' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" title="Auto-refresh ativo" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-[#6b7280]" title="Auto-refresh desativado" />
            )}
          </div>

          {/* MODO APRESENTAÇÃO BUTTON */}
          <button
            type="button"
            onClick={onTogglePresentationMode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#272623] hover:bg-[#33312c] text-[#38bdf8] border border-[#38bdf8]/40 transition-colors shadow-xs cursor-pointer hover:border-[#38bdf8]"
            title="Modo Apresentação: Maximiza gráficos e KPIs em tela cheia para monitores e TVs da fábrica"
          >
            <Tv className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Modo Apresentação</span>
          </button>

          {/* Share button ONLY visible for Admin */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenShareSync}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#272623] hover:bg-[#33312c] text-[#4ade80] border border-[#22c55e]/40 transition-colors shadow-xs cursor-pointer"
              title="Compartilhar acesso com a equipe e sincronizar dados"
            >
              <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
              <span>Compartilhar em Rede</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenFinancial}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#272623] hover:bg-[#33312c] text-[#f4efe6] border border-[#393733] transition-colors shadow-xs cursor-pointer"
            title="Calcular custos financeiros de perdas e desperdícios"
          >
            <Calculator className="w-3.5 h-3.5 text-[#fb923c]" />
            <span>Simulador de Custos</span>
          </button>

          {/* Threshold Alerts Button */}
          {onOpenAlertSettings && (
            <button
              type="button"
              onClick={onOpenAlertSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#272623] hover:bg-[#33312c] text-[#f4efe6] border border-[#393733] hover:border-[#f87171]/50 transition-colors shadow-xs cursor-pointer"
              title="Configurar limites de alerta para perdas percentuais"
            >
              <BellRing className="w-3.5 h-3.5 text-[#f87171]" />
              <span>Alertas ({alertThresholds.criticalLossPct}%)</span>
            </button>
          )}

          {/* Import Base is EXCLUSIVELY available for Admin */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#272623] hover:bg-[#33312c] text-[#38bdf8] border border-[#38bdf8]/40 transition-colors shadow-xs cursor-pointer"
              title="Importar dados de planilha Excel ou CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Importar Base (.xlsx)</span>
            </button>
          )}

          {/* Admin Login button when in view-only / not admin */}
          {!isAdmin && (
            <button
              type="button"
              onClick={onOpenAdminAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#272623] hover:bg-[#33312c] text-[#ea580c] border border-[#ea580c]/40 hover:border-[#ea580c] transition-colors shadow-xs cursor-pointer"
              title="Acesso Administrador: digite a senha para importar dados e sincronizar"
            >
              <Lock className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>Acesso Admin</span>
            </button>
          )}

          {/* DEDICATED PDF DOWNLOAD BUTTON (jsPDF + html2canvas) */}
          <button
            type="button"
            disabled={isExportingPdf}
            onClick={onExportPdf}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer ${
              isExportingPdf
                ? 'bg-[#c85a2b]/60 text-white cursor-wait'
                : 'bg-[#c85a2b] hover:bg-[#b84f23] text-white ring-1 ring-[#ea580c]/50'
            }`}
            title="Gerar e baixar relatório executivo em PDF com todos os gráficos e métricas renderizados"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>Baixar PDF Completo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
