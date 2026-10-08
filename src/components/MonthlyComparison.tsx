import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeftRight,
  Flame,
  BarChart3,
  Percent,
  Package,
} from 'lucide-react';
import { ChamberRecord } from '../types';
import {
  compareMonths,
  formatNumberBR,
  formatPercentBR,
  getAvailableMonths,
} from '../utils/calculations';

interface MonthlyComparisonProps {
  records: ChamberRecord[];
  activeMonthKey?: string;
}

type ChartViewMode = 'geral' | 'fornos-volume' | 'fornos-eficiencia' | 'defeitos';

export const MonthlyComparison: React.FC<MonthlyComparisonProps> = ({
  records,
  activeMonthKey,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('geral');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Detect months available in dataset
  const availableMonths = useMemo(() => {
    return getAvailableMonths(records);
  }, [records]);

  // Selected months state: Month A (Base) and Month B (Comparado)
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(() => {
    if (activeMonthKey && activeMonthKey !== 'all') return activeMonthKey;
    return availableMonths[0]?.monthKey || '';
  });

  const [previousMonthKey, setPreviousMonthKey] = useState<string>(() => {
    const idx = availableMonths.findIndex((m) => m.monthKey === (activeMonthKey || currentMonthKey));
    if (idx !== -1 && availableMonths[idx + 1]) {
      return availableMonths[idx + 1].monthKey;
    }
    return availableMonths[1]?.monthKey || availableMonths[0]?.monthKey || '';
  });

  // Keep state in sync when activeMonthKey or records change
  React.useEffect(() => {
    if (availableMonths.length === 0) return;

    if (activeMonthKey && activeMonthKey !== 'all' && availableMonths.some((m) => m.monthKey === activeMonthKey)) {
      setCurrentMonthKey(activeMonthKey);
      const idx = availableMonths.findIndex((m) => m.monthKey === activeMonthKey);
      if (idx !== -1) {
        if (availableMonths[idx + 1]) {
          setPreviousMonthKey(availableMonths[idx + 1].monthKey);
        } else if (availableMonths[idx - 1]) {
          setPreviousMonthKey(availableMonths[idx - 1].monthKey);
        }
      }
    } else if (availableMonths.length > 0) {
      const curKey = availableMonths.some((m) => m.monthKey === currentMonthKey)
        ? currentMonthKey
        : availableMonths[0].monthKey;
      setCurrentMonthKey(curKey);

      if (availableMonths.length > 1) {
        if (!availableMonths.some((m) => m.monthKey === previousMonthKey) || previousMonthKey === curKey) {
          const other = availableMonths.find((m) => m.monthKey !== curKey);
          setPreviousMonthKey(other ? other.monthKey : availableMonths[1].monthKey);
        }
      } else {
        setPreviousMonthKey(curKey);
      }
    }
  }, [activeMonthKey, availableMonths]);

  // Handler to swap Month A and Month B
  const handleSwapMonths = () => {
    const temp = currentMonthKey;
    setCurrentMonthKey(previousMonthKey);
    setPreviousMonthKey(temp);
  };

  // Calculate comparison data
  const comparison = useMemo(() => {
    if (records.length === 0) return null;
    return compareMonths(records, currentMonthKey, previousMonthKey);
  }, [records, currentMonthKey, previousMonthKey]);

  if (!comparison || records.length === 0) {
    return null;
  }

  const {
    currentMonth,
    previousMonth,
    isBenchmarkSimulated,
    eficienciaDelta,
    perdaDelta,
    enfornaDelta,
    enfornaDeltaPct,
    desenfornaDelta,
    desenfornaDeltaPct,
    produtividadeVolumeDelta,
    produtividadeVolumeDeltaPct,
    produtividadeTaxaDeltaPp,
    produtividadeTaxaDeltaPct,
    perda2GrauDeltaPp,
    perdaCruaDeltaPp,
    perdaTrincaDeltaPp,
    perdaQuebraDeltaPp,
    status,
    primaryHighlight,
    ovenBestGain,
    ovenWorstDrop,
  } = comparison;

  const isMelhoria = status === 'melhoria' || produtividadeVolumeDeltaPct > 0.5;
  const isPiora = status === 'piora' || produtividadeVolumeDeltaPct < -0.5;

  // Defect items comparison
  const defectsComparison = [
    {
      tipo: 'Trinca',
      color: '#f87171',
      bgBar: 'bg-[#f87171]',
      prevPieces: previousMonth.metrics.perdaTrinca,
      prevPct: previousMonth.metrics.perdaTrincaPct,
      curPieces: currentMonth.metrics.perdaTrinca,
      curPct: currentMonth.metrics.perdaTrincaPct,
      deltaPp: perdaTrincaDeltaPp,
      deltaPieces: currentMonth.metrics.perdaTrinca - previousMonth.metrics.perdaTrinca,
    },
    {
      tipo: '2ª Linha',
      color: '#eab308',
      bgBar: 'bg-[#eab308]',
      prevPieces: previousMonth.metrics.perda2Grau,
      prevPct: previousMonth.metrics.perda2GrauPct,
      curPieces: currentMonth.metrics.perda2Grau,
      curPct: currentMonth.metrics.perda2GrauPct,
      deltaPp: perda2GrauDeltaPp,
      deltaPieces: currentMonth.metrics.perda2Grau - previousMonth.metrics.perda2Grau,
    },
    {
      tipo: 'Crua',
      color: '#60a5fa',
      bgBar: 'bg-[#60a5fa]',
      prevPieces: previousMonth.metrics.perdaCrua,
      prevPct: previousMonth.metrics.perdaCruaPct,
      curPieces: currentMonth.metrics.perdaCrua,
      curPct: currentMonth.metrics.perdaCruaPct,
      deltaPp: perdaCruaDeltaPp,
      deltaPieces: currentMonth.metrics.perdaCrua - previousMonth.metrics.perdaCrua,
    },
    {
      tipo: 'Quebra',
      color: '#fb923c',
      bgBar: 'bg-[#fb923c]',
      prevPieces: previousMonth.metrics.perdaQuebra,
      prevPct: previousMonth.metrics.perdaQuebraPct,
      curPieces: currentMonth.metrics.perdaQuebra,
      curPct: currentMonth.metrics.perdaQuebraPct,
      deltaPp: perdaQuebraDeltaPp,
      deltaPieces: currentMonth.metrics.perdaQuebra - previousMonth.metrics.perdaQuebra,
    },
  ];

  // Data for Comparative Bar Chart (General Pillars)
  const generalBarsData = [
    {
      label: 'Produção Útil (Desenforna)',
      subtitle: 'Peças de 1ª qualidade aproveitadas',
      valPrev: previousMonth.metrics.totalDesenforna,
      valCur: currentMonth.metrics.totalDesenforna,
      delta: desenfornaDelta,
      deltaPct: desenfornaDeltaPct,
      unit: 'peças',
      isGoodWhenHigher: true,
    },
    {
      label: 'Volume Enfornado',
      subtitle: 'Carga total alimentada nos fornos',
      valPrev: previousMonth.metrics.totalEnforna,
      valCur: currentMonth.metrics.totalEnforna,
      delta: enfornaDelta,
      deltaPct: enfornaDeltaPct,
      unit: 'peças',
      isGoodWhenHigher: true,
    },
    {
      label: 'Perdas Totais da Queima',
      subtitle: 'Soma de trincas, 2ª linha, cruas e quebras',
      valPrev: previousMonth.metrics.totalPerdas,
      valCur: currentMonth.metrics.totalPerdas,
      delta: currentMonth.metrics.totalPerdas - previousMonth.metrics.totalPerdas,
      deltaPct: previousMonth.metrics.totalPerdas > 0
        ? ((currentMonth.metrics.totalPerdas - previousMonth.metrics.totalPerdas) / previousMonth.metrics.totalPerdas) * 100
        : 0,
      unit: 'peças',
      isGoodWhenHigher: false,
    },
  ];

  // Data for Oven Comparative Bars
  const ovenBarsData = currentMonth.ovenSummaries.map((curOven) => {
    const prevOven = previousMonth.ovenSummaries.find((p) => p.forno === curOven.forno);
    const prevDes = prevOven ? prevOven.desenforna : 0;
    const prevEf = prevOven ? prevOven.eficienciaPct : 0;
    const prevPerda = prevOven ? prevOven.perda : 0;

    const deltaDes = curOven.desenforna - prevDes;
    const deltaDesPct = prevDes > 0 ? (deltaDes / prevDes) * 100 : 0;

    const deltaEf = curOven.eficienciaPct - prevEf;
    const deltaPerda = curOven.perda - prevPerda;
    const deltaPerdaPct = prevPerda > 0 ? (deltaPerda / prevPerda) * 100 : 0;

    return {
      forno: curOven.forno,
      desPrev: prevDes,
      desCur: curOven.desenforna,
      deltaDes,
      deltaDesPct,
      efPrev: prevEf,
      efCur: curOven.eficienciaPct,
      deltaEf,
      perdaPrev: prevPerda,
      perdaCur: curOven.perda,
      deltaPerda,
      deltaPerdaPct,
    };
  });

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#1c1b19] border border-[#2e2d2a] shadow-sm mb-6 transition-all">
      {/* Top Header & Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#2a2926]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`p-1.5 rounded-lg border ${
                isMelhoria
                  ? 'bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/30'
                  : isPiora
                  ? 'bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30'
                  : 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30'
              }`}
            >
              {isMelhoria ? (
                <TrendingUp className="w-4 h-4" />
              ) : isPiora ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#f4efe6]">
              Comparativo Mensal de Desempenho
            </h2>
          </div>
          <p className="text-xs text-[#9e988f]">
            Selecione dois meses para comparar produtividade, volume útil e eficiência entre períodos
          </p>
        </div>

        {/* Month Selection Bar with 2 Selectors and Swap button */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto no-print">
          {/* Mês A (Base) */}
          <div className="flex items-center gap-1.5 bg-[#242320] border border-[#33312e] rounded-xl px-2.5 py-1.5 text-xs text-[#ded8ce]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shrink-0" title="Cor no gráfico: Mês A (Base)" />
            <span className="text-[#8c867e] font-medium">Mês A:</span>
            <select
              value={previousMonthKey}
              onChange={(e) => setPreviousMonthKey(e.target.value)}
              className="bg-transparent text-[#f4efe6] font-semibold focus:outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={`prev-${m.monthKey}`} value={m.monthKey} className="bg-[#1c1b19] text-[#f4efe6]">
                  {m.label} ({m.count} câmaras)
                </option>
              ))}
              {availableMonths.length === 1 && (
                <option value="__SIMULATED_BENCHMARK__" className="bg-[#1c1b19] text-[#f4efe6]">
                  Mês Anterior (Referência Histórica)
                </option>
              )}
            </select>
          </div>

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwapMonths}
            className="p-1.5 rounded-lg bg-[#272623] hover:bg-[#34332f] text-[#ded8ce] hover:text-[#fb923c] transition-colors cursor-pointer border border-[#33312e]"
            title="Inverter meses comparados"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          {/* Mês B (Comparado) */}
          <div className="flex items-center gap-1.5 bg-[#242320] border border-[#33312e] rounded-xl px-2.5 py-1.5 text-xs text-[#ded8ce]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#fb923c] shrink-0" title="Cor no gráfico: Mês B (Comparado)" />
            <span className="text-[#8c867e] font-medium">Mês B:</span>
            <select
              value={currentMonthKey}
              onChange={(e) => setCurrentMonthKey(e.target.value)}
              className="bg-transparent text-[#f4efe6] font-semibold focus:outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={`cur-${m.monthKey}`} value={m.monthKey} className="bg-[#1c1b19] text-[#f4efe6]">
                  {m.label} ({m.count} câmaras)
                </option>
              ))}
            </select>
          </div>

          {/* Collapse/Expand */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-[#272623] hover:bg-[#34332f] text-[#8c867e] hover:text-[#f4efe6] transition-colors cursor-pointer"
            title={isExpanded ? 'Recolher comparativo' : 'Expandir comparativo'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5 space-y-6">
          {/* ========================================================================= */}
          {/* 1. DESTAQUE EXECUTIVO DA VARIAÇÃO PERCENTUAL DE PRODUTIVIDADE */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Banner Principal de Produtividade Útil */}
            <div
              className={`md:col-span-2 p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between ${
                produtividadeVolumeDeltaPct >= 0
                  ? 'bg-gradient-to-br from-[#22c55e]/15 via-[#1c1b19] to-[#1c1b19] border-[#22c55e]/40'
                  : 'bg-gradient-to-br from-[#ef4444]/15 via-[#1c1b19] to-[#1c1b19] border-[#ef4444]/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        produtividadeVolumeDeltaPct >= 0
                          ? 'bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/30'
                          : 'bg-[#ef4444]/20 text-[#f87171] border border-[#ef4444]/30'
                      }`}
                    >
                      {produtividadeVolumeDeltaPct >= 0 ? 'Ganho de Produtividade' : 'Queda de Produtividade'}
                    </span>
                    {isBenchmarkSimulated && (
                      <span className="text-[10px] font-medium text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded-md border border-[#38bdf8]/20">
                        Referência Histórica
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#f4efe6]">
                    Variação Percentual de Produtividade
                  </h3>
                  <p className="text-xs text-[#9e988f] mt-0.5">
                    Comparativo entre {previousMonth.label} e {currentMonth.label}
                  </p>
                </div>

                {/* Big Percentage Badge */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                      produtividadeVolumeDeltaPct >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'
                    }`}
                  >
                    {produtividadeVolumeDeltaPct >= 0 ? `+${produtividadeVolumeDeltaPct.toFixed(1).replace('.', ',')}%` : `${produtividadeVolumeDeltaPct.toFixed(1).replace('.', ',')}%`}
                  </div>
                  <div className="text-[11px] font-mono text-[#b0aba2] mt-0.5">
                    {produtividadeVolumeDelta >= 0 ? `+${formatNumberBR(produtividadeVolumeDelta)}` : formatNumberBR(produtividadeVolumeDelta)} peças úteis
                  </div>
                </div>
              </div>

              {/* Comparativo Direto Mês A vs Mês B */}
              <div className="mt-4 pt-4 border-t border-[#2d2c28] grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-1.5 text-[#8c867e] mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                    <span>Mês A ({previousMonth.label}):</span>
                  </div>
                  <div className="text-sm sm:text-base font-bold font-mono text-[#38bdf8]">
                    {formatNumberBR(previousMonth.metrics.totalDesenforna)} peças
                  </div>
                  <div className="text-[11px] text-[#8c867e] font-mono">
                    Rendimento: {formatPercentBR(previousMonth.metrics.eficienciaPct)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[#8c867e] mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#fb923c]" />
                    <span>Mês B ({currentMonth.label}):</span>
                  </div>
                  <div className="text-sm sm:text-base font-bold font-mono text-[#fb923c]">
                    {formatNumberBR(currentMonth.metrics.totalDesenforna)} peças
                  </div>
                  <div className="text-[11px] text-[#8c867e] font-mono">
                    Rendimento: {formatPercentBR(currentMonth.metrics.eficienciaPct)}
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnóstico Executivo de Eficiência */}
            <div className="p-5 rounded-2xl bg-[#242320] border border-[#2e2d2a] flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-[#8c867e] uppercase font-bold tracking-wider mb-1">
                  Taxa de Rendimento Útil
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-[#f4efe6]">
                    {eficienciaDelta >= 0 ? `+${eficienciaDelta.toFixed(1).replace('.', ',')}` : eficienciaDelta.toFixed(1).replace('.', ',')} pp
                  </span>
                  <span
                    className={`text-xs font-bold font-mono ${
                      eficienciaDelta >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'
                    }`}
                  >
                    ({produtividadeTaxaDeltaPct >= 0 ? `+${produtividadeTaxaDeltaPct.toFixed(1)}%` : `${produtividadeTaxaDeltaPct.toFixed(1)}%`} rel.)
                  </span>
                </div>
                <p className="text-xs text-[#9e988f] mt-2 leading-relaxed">
                  {primaryHighlight}
                </p>
              </div>

              {ovenBestGain && (
                <div className="mt-3 pt-3 border-t border-[#2e2d2a] text-xs">
                  <div className="text-[#8c867e] text-[11px]">Destaque por Forno:</div>
                  <div className="font-semibold text-[#4ade80] mt-0.5">
                    ★ {ovenBestGain.forno} (+{ovenBestGain.deltaPp.toFixed(1)} pp)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. GRÁFICO DE BARRAS COMPARATIVO DE DESEMPENHO */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#22211e] border border-[#2e2d2a]">
            {/* Header do Gráfico + Seletor de visualização */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#2d2c28]">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#fb923c]" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#f4efe6]">
                    Gráfico Comparativo de Desempenho
                  </h3>
                  <p className="text-xs text-[#9e988f]">
                    Comparação direta de barras lado a lado entre os dois períodos
                  </p>
                </div>
              </div>

              {/* Botões de alternância da visualização do gráfico */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs bg-[#1a1917] p-1 rounded-xl border border-[#2e2d2a]">
                <button
                  type="button"
                  onClick={() => setChartViewMode('geral')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    chartViewMode === 'geral'
                      ? 'bg-[#fb923c] text-[#1c1b19] font-bold shadow-xs'
                      : 'text-[#9e988f] hover:text-[#f4efe6] hover:bg-[#262522]'
                  }`}
                >
                  Indicadores Gerais
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('fornos-volume')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    chartViewMode === 'fornos-volume'
                      ? 'bg-[#fb923c] text-[#1c1b19] font-bold shadow-xs'
                      : 'text-[#9e988f] hover:text-[#f4efe6] hover:bg-[#262522]'
                  }`}
                >
                  Fornos (Volume)
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('fornos-eficiencia')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    chartViewMode === 'fornos-eficiencia'
                      ? 'bg-[#fb923c] text-[#1c1b19] font-bold shadow-xs'
                      : 'text-[#9e988f] hover:text-[#f4efe6] hover:bg-[#262522]'
                  }`}
                >
                  Fornos (Eficiência %)
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('defeitos')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    chartViewMode === 'defeitos'
                      ? 'bg-[#fb923c] text-[#1c1b19] font-bold shadow-xs'
                      : 'text-[#9e988f] hover:text-[#f4efe6] hover:bg-[#262522]'
                  }`}
                >
                  Causas de Perda
                </button>
              </div>
            </div>

            {/* Legenda das cores dos Meses */}
            <div className="flex items-center gap-6 text-xs mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-[#38bdf8]" />
                <span className="font-semibold text-[#ded8ce]">
                  Mês A: {previousMonth.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-[#fb923c]" />
                <span className="font-semibold text-[#ded8ce]">
                  Mês B: {currentMonth.label}
                </span>
              </div>
            </div>

            {/* MODO 1: Indicadores Gerais (Produção Útil, Enforna, Perdas) */}
            {chartViewMode === 'geral' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {generalBarsData.map((item, idx) => {
                  const maxVal = Math.max(item.valPrev, item.valCur, 1);
                  const hPrev = (item.valPrev / maxVal) * 100;
                  const hCur = (item.valCur / maxVal) * 100;
                  const isPositiveDelta = item.delta > 0;
                  const isGood = item.isGoodWhenHigher ? isPositiveDelta : !isPositiveDelta;

                  return (
                    <div
                      key={item.label}
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      className="p-4 rounded-xl bg-[#1c1b19] border border-[#2d2c28] hover:border-[#3d3c38] transition-all flex flex-col justify-between"
                    >
                      <div className="mb-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#f4efe6]">
                            {item.label}
                          </h4>
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                              isGood
                                ? 'bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30'
                                : 'bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30'
                            }`}
                          >
                            {item.deltaPct >= 0 ? `+${item.deltaPct.toFixed(1)}%` : `${item.deltaPct.toFixed(1)}%`}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8c867e] mt-0.5">{item.subtitle}</p>
                      </div>

                      {/* Side-by-Side Bars Container */}
                      <div className="h-44 flex items-end justify-center gap-6 px-4 pt-4 pb-2 border-b border-[#2d2c28]">
                        {/* Bar Mês A */}
                        <div className="flex-1 flex flex-col items-center justify-end h-full max-w-[64px]">
                          <span className="text-[11px] font-mono font-bold text-[#38bdf8] mb-1.5 tabular-nums">
                            {formatNumberBR(item.valPrev)}
                          </span>
                          <div
                            className="w-full bg-[#38bdf8] rounded-t-md transition-all duration-300 hover:brightness-110"
                            style={{ height: `${Math.max(8, hPrev)}%` }}
                          />
                          <span className="text-[10px] text-[#8c867e] mt-1.5 font-medium truncate max-w-full">
                            Mês A
                          </span>
                        </div>

                        {/* Bar Mês B */}
                        <div className="flex-1 flex flex-col items-center justify-end h-full max-w-[64px]">
                          <span className="text-[11px] font-mono font-bold text-[#fb923c] mb-1.5 tabular-nums">
                            {formatNumberBR(item.valCur)}
                          </span>
                          <div
                            className="w-full bg-[#fb923c] rounded-t-md transition-all duration-300 hover:brightness-110"
                            style={{ height: `${Math.max(8, hCur)}%` }}
                          />
                          <span className="text-[10px] text-[#8c867e] mt-1.5 font-medium truncate max-w-full">
                            Mês B
                          </span>
                        </div>
                      </div>

                      {/* Footer Delta */}
                      <div className="mt-3 flex items-center justify-between text-xs text-[#8c867e]">
                        <span>Diferença:</span>
                        <span className="font-mono font-bold text-[#f4efe6]">
                          {item.delta >= 0 ? `+${formatNumberBR(item.delta)}` : formatNumberBR(item.delta)} {item.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODO 2: Desempenho por Forno - Volume de Produção Útil */}
            {chartViewMode === 'fornos-volume' && (
              <div className="space-y-4 pt-2">
                <div className="text-xs text-[#8c867e] mb-2">
                  Volume de Desenforna Útil (peças aproveitadas) em cada forno:
                </div>
                {ovenBarsData.map((item) => {
                  const maxVal = Math.max(item.desPrev, item.desCur, 1);
                  const wPrev = (item.desPrev / maxVal) * 100;
                  const wCur = (item.desCur / maxVal) * 100;
                  const isBetter = item.deltaDes >= 0;

                  return (
                    <div
                      key={item.forno}
                      className="p-3.5 rounded-xl bg-[#1c1b19] border border-[#2d2c28] hover:border-[#383733] transition-all"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2 font-bold text-[#f4efe6]">
                          <Flame className="w-4 h-4 text-[#fb923c]" />
                          <span>{item.forno}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#8c867e] font-mono text-[11px]">
                            {formatNumberBR(item.desPrev)} → <strong className="text-[#f4efe6]">{formatNumberBR(item.desCur)}</strong> peças
                          </span>
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              isBetter
                                ? 'bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30'
                                : 'bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30'
                            }`}
                          >
                            {item.deltaDesPct >= 0 ? `+${item.deltaDesPct.toFixed(1)}%` : `${item.deltaDesPct.toFixed(1)}%`}
                          </span>
                        </div>
                      </div>

                      {/* Two horizontal bars side by side */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[#8c867e]">
                          <span className="w-12 text-[#38bdf8] font-medium shrink-0">Mês A</span>
                          <div className="flex-1 h-3.5 bg-[#262522] rounded overflow-hidden">
                            <div
                              className="h-full bg-[#38bdf8] rounded transition-all duration-300"
                              style={{ width: `${Math.max(2, wPrev)}%` }}
                              title={`Mês A: ${formatNumberBR(item.desPrev)} peças`}
                            />
                          </div>
                          <span className="w-16 text-right tabular-nums">{formatNumberBR(item.desPrev)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono text-[#8c867e]">
                          <span className="w-12 text-[#fb923c] font-medium shrink-0">Mês B</span>
                          <div className="flex-1 h-3.5 bg-[#262522] rounded overflow-hidden">
                            <div
                              className="h-full bg-[#fb923c] rounded transition-all duration-300"
                              style={{ width: `${Math.max(2, wCur)}%` }}
                              title={`Mês B: ${formatNumberBR(item.desCur)} peças`}
                            />
                          </div>
                          <span className="w-16 text-right tabular-nums font-bold text-[#f4efe6]">{formatNumberBR(item.desCur)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODO 3: Desempenho por Forno - Taxa de Eficiência (%) */}
            {chartViewMode === 'fornos-eficiencia' && (
              <div className="space-y-4 pt-2">
                <div className="text-xs text-[#8c867e] mb-2">
                  Taxa de aproveitamento da queima (%) em cada forno:
                </div>
                {ovenBarsData.map((item) => {
                  const isBetter = item.deltaEf >= 0;

                  return (
                    <div
                      key={item.forno}
                      className="p-3.5 rounded-xl bg-[#1c1b19] border border-[#2d2c28] hover:border-[#383733] transition-all"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2 font-bold text-[#f4efe6]">
                          <Flame className="w-4 h-4 text-[#fb923c]" />
                          <span>{item.forno}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#8c867e] font-mono text-[11px]">
                            {formatPercentBR(item.efPrev, 1)} → <strong className="text-[#f4efe6]">{formatPercentBR(item.efCur, 1)}</strong>
                          </span>
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              isBetter
                                ? 'bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30'
                                : 'bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30'
                            }`}
                          >
                            {item.deltaEf >= 0 ? `+${item.deltaEf.toFixed(1).replace('.', ',')}` : item.deltaEf.toFixed(1).replace('.', ',')} pp
                          </span>
                        </div>
                      </div>

                      {/* Progress Comparison Bars */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[#8c867e]">
                          <span className="w-12 text-[#38bdf8] font-medium shrink-0">Mês A</span>
                          <div className="flex-1 h-3.5 bg-[#262522] rounded overflow-hidden">
                            <div
                              className="h-full bg-[#38bdf8] rounded transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(2, item.efPrev))}%` }}
                              title={`Mês A: ${formatPercentBR(item.efPrev)}`}
                            />
                          </div>
                          <span className="w-14 text-right tabular-nums">{formatPercentBR(item.efPrev, 1)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono text-[#8c867e]">
                          <span className="w-12 text-[#fb923c] font-medium shrink-0">Mês B</span>
                          <div className="flex-1 h-3.5 bg-[#262522] rounded overflow-hidden">
                            <div
                              className="h-full bg-[#fb923c] rounded transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(2, item.efCur))}%` }}
                              title={`Mês B: ${formatPercentBR(item.efCur)}`}
                            />
                          </div>
                          <span className="w-14 text-right tabular-nums font-bold text-[#f4efe6]">{formatPercentBR(item.efCur, 1)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODO 4: Causas de Perda (Trinca, 2ª Linha, Crua, Quebra) */}
            {chartViewMode === 'defeitos' && (
              <div className="space-y-4 pt-2">
                <div className="text-xs text-[#8c867e] mb-2">
                  Evolução das perdas por tipo de defeito entre os períodos selecionados:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {defectsComparison.map((d) => {
                    const isBetter = d.deltaPieces <= 0;
                    const maxDefect = Math.max(d.prevPieces, d.curPieces, 1);
                    const wPrev = (d.prevPieces / maxDefect) * 100;
                    const wCur = (d.curPieces / maxDefect) * 100;

                    return (
                      <div
                        key={d.tipo}
                        className="p-4 rounded-xl bg-[#1c1b19] border border-[#2d2c28] hover:border-[#383733] transition-all"
                      >
                        <div className="flex items-center justify-between text-xs mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${d.bgBar}`} />
                            <span className="font-bold text-[#f4efe6]">{d.tipo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#8c867e] font-mono text-[11px]">
                              {formatNumberBR(d.prevPieces)} → <strong className="text-[#f4efe6]">{formatNumberBR(d.curPieces)}</strong>
                            </span>
                            <span
                              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                isBetter
                                  ? 'bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30'
                                  : 'bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30'
                              }`}
                            >
                              {d.deltaPp > 0 ? `+${d.deltaPp.toFixed(2).replace('.', ',')}` : d.deltaPp.toFixed(2).replace('.', ',')} pp
                            </span>
                          </div>
                        </div>

                        {/* Visual Bar Comparison */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-[11px] font-mono text-[#8c867e]">
                            <span className="w-12 text-[#38bdf8] font-medium shrink-0">Mês A</span>
                            <div className="flex-1 h-3 bg-[#262522] rounded overflow-hidden">
                              <div
                                className="h-full bg-[#38bdf8] rounded"
                                style={{ width: `${Math.max(2, wPrev)}%` }}
                              />
                            </div>
                            <span className="w-14 text-right tabular-nums">{formatPercentBR(d.prevPct, 2)}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-[#8c867e]">
                            <span className="w-12 text-[#fb923c] font-medium shrink-0">Mês B</span>
                            <div className="flex-1 h-3 bg-[#262522] rounded overflow-hidden">
                              <div
                                className="h-full bg-[#fb923c] rounded"
                                style={{ width: `${Math.max(2, wCur)}%` }}
                              />
                            </div>
                            <span className="w-14 text-right tabular-nums font-bold text-[#f4efe6]">{formatPercentBR(d.curPct, 2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. 4 CARTÕES DE KPIS LADO A LADO: MÊS A vs MÊS B */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Eficiência Útil */}
            <div className="p-3.5 rounded-xl bg-[#242320] border-t-2 border-t-[#38bdf8] border border-[#2e2d2a]">
              <div className="text-[10px] text-[#8c867e] uppercase font-bold">Eficiência da Queima</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-[#f4efe6]">
                  {formatPercentBR(currentMonth.metrics.eficienciaPct)}
                </span>
                <span
                  className={`text-xs font-bold font-mono ${
                    eficienciaDelta >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'
                  }`}
                >
                  {eficienciaDelta >= 0 ? `▲ +${eficienciaDelta.toFixed(1).replace('.', ',')}` : `▼ ${eficienciaDelta.toFixed(1).replace('.', ',')}`} pp
                </span>
              </div>
              <div className="text-[11px] text-[#8c867e] mt-1 pt-1 border-t border-[#2d2c28] flex items-center justify-between">
                <span>Mês A:</span>
                <span className="font-mono text-[#ded8ce]">{formatPercentBR(previousMonth.metrics.eficienciaPct)}</span>
              </div>
            </div>

            {/* 2. Taxa de Perdas */}
            <div className="p-3.5 rounded-xl bg-[#242320] border-t-2 border-t-[#f87171] border border-[#2e2d2a]">
              <div className="text-[10px] text-[#8c867e] uppercase font-bold">Taxa de Perdas</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-[#f87171]">
                  {formatPercentBR(currentMonth.metrics.perdaPct)}
                </span>
                <span
                  className={`text-xs font-bold font-mono ${
                    perdaDelta <= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'
                  }`}
                >
                  {perdaDelta <= 0 ? `▼ ${perdaDelta.toFixed(1).replace('.', ',')}` : `▲ +${perdaDelta.toFixed(1).replace('.', ',')}`} pp
                </span>
              </div>
              <div className="text-[11px] text-[#8c867e] mt-1 pt-1 border-t border-[#2d2c28] flex items-center justify-between">
                <span>Mês A:</span>
                <span className="font-mono text-[#ded8ce]">{formatPercentBR(previousMonth.metrics.perdaPct)}</span>
              </div>
            </div>

            {/* 3. Enforna Total */}
            <div className="p-3.5 rounded-xl bg-[#242320] border-t-2 border-t-[#38bdf8] border border-[#2e2d2a]">
              <div className="text-[10px] text-[#8c867e] uppercase font-bold">Enforna Total</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg sm:text-xl font-bold font-mono text-[#38bdf8]">
                  {formatNumberBR(currentMonth.metrics.totalEnforna)}
                </span>
                <span className="text-xs font-mono text-[#b0aba2]">
                  {enfornaDelta >= 0 ? `+${formatNumberBR(enfornaDelta)}` : formatNumberBR(enfornaDelta)}
                </span>
              </div>
              <div className="text-[11px] text-[#8c867e] mt-1 pt-1 border-t border-[#2d2c28] flex items-center justify-between">
                <span>Variação:</span>
                <span className="font-mono text-[#ded8ce]">{enfornaDeltaPct >= 0 ? `+${enfornaDeltaPct.toFixed(1)}%` : `${enfornaDeltaPct.toFixed(1)}%`}</span>
              </div>
            </div>

            {/* 4. Desenforna Útil */}
            <div className="p-3.5 rounded-xl bg-[#242320] border-t-2 border-t-[#fb923c] border border-[#2e2d2a]">
              <div className="text-[10px] text-[#8c867e] uppercase font-bold">Desenforna Útil</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg sm:text-xl font-bold font-mono text-[#fb923c]">
                  {formatNumberBR(currentMonth.metrics.totalDesenforna)}
                </span>
                <span className="text-xs font-mono text-[#b0aba2]">
                  {desenfornaDelta >= 0 ? `+${formatNumberBR(desenfornaDelta)}` : formatNumberBR(desenfornaDelta)}
                </span>
              </div>
              <div className="text-[11px] text-[#8c867e] mt-1 pt-1 border-t border-[#2d2c28] flex items-center justify-between">
                <span>Variação:</span>
                <span className="font-mono text-[#ded8ce]">{desenfornaDeltaPct >= 0 ? `+${desenfornaDeltaPct.toFixed(1)}%` : `${desenfornaDeltaPct.toFixed(1)}%`}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
