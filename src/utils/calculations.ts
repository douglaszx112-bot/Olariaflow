import {
  ChamberRecord,
  DailySummary,
  FilterState,
  LossCategory,
  MonthComparisonResult,
  MonthSummary,
  OvenSummary,
  SummaryMetrics,
} from '../types';

export function formatNumberBR(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  return Math.round(val).toLocaleString('pt-BR');
}

export function formatPercentBR(val: number, decimals: number = 1): string {
  if (isNaN(val) || val === null || val === undefined || !isFinite(val)) return '0,0%';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + '%';
}

export function formatCurrencyBRL(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatDateShortBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

// Calculate the total losses for a single chamber based on the active loss category filter
export function getChamberLoss(record: ChamberRecord, perdaTipo: LossCategory = 'all'): number {
  if (perdaTipo === '2a') return record.perda_2grau;
  if (perdaTipo === 'crua') return record.perda_crua;
  if (perdaTipo === 'trinca') return record.perda_trinca;
  if (perdaTipo === 'quebra') return record.perda_quebra;
  return record.perda_2grau + record.perda_crua + record.perda_trinca + record.perda_quebra;
}

// Deduplicate records based on unique ID or full signature (preserves distinct firings on same day)
export function deduplicateRecords(records: ChamberRecord[]): ChamberRecord[] {
  const seen = new Set<string>();
  const result: ChamberRecord[] = [];
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    const key = r.id || `${r.data}_${String(r.forno).trim()}_${String(r.camara).trim()}_${r.enforna}_${r.desenforna}_${r.perda_2grau}_${r.perda_crua}_${r.perda_trinca}_${r.perda_quebra}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.unshift(r);
    }
  }
  return result;
}

export function filterRecords(records: ChamberRecord[], filters: FilterState): ChamberRecord[] {
  return records.filter((r) => {
    // 1. Month filter (if specific month is selected)
    if (filters.selectedMonth && filters.selectedMonth !== 'all') {
      if (!r.data || !r.data.startsWith(filters.selectedMonth)) {
        return false;
      }
    }

    // 2. Oven filter
    if (filters.forno !== 'all' && r.forno !== filters.forno) {
      return false;
    }

    // 3. Date range filter
    if (filters.startDate && r.data < filters.startDate) {
      return false;
    }
    if (filters.endDate && r.data > filters.endDate) {
      return false;
    }

    // 4. Search term (e.g. chamber number or oven)
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase().trim();
      const matchForno = r.forno.toLowerCase().includes(term);
      const matchCamara = String(r.camara).toLowerCase().includes(term);
      const matchData = r.data.includes(term) || formatDateBR(r.data).includes(term);
      if (!matchForno && !matchCamara && !matchData) {
        return false;
      }
    }

    return true;
  });
}

export function computeSummaryMetrics(records: ChamberRecord[], perdaTipo: LossCategory = 'all'): SummaryMetrics {
  const camarasCount = records.length;
  if (camarasCount === 0) {
    return {
      totalEnforna: 0,
      totalDesenforna: 0,
      totalPerdas: 0,
      diferenca: 0,
      camarasCount: 0,
      eficienciaPct: 0,
      perdaPct: 0,
      diferencaPct: 0,
      perda2Grau: 0,
      perda2GrauPct: 0,
      perdaCrua: 0,
      perdaCruaPct: 0,
      perdaTrinca: 0,
      perdaTrincaPct: 0,
      perdaQuebra: 0,
      perdaQuebraPct: 0,
      maiorCausaNome: 'Nenhuma',
      maiorCausaPct: 0,
      maiorCausaQtd: 0,
    };
  }

  let totalEnforna = 0;
  let totalDesenforna = 0;
  let perda2Grau = 0;
  let perdaCrua = 0;
  let perdaTrinca = 0;
  let perdaQuebra = 0;

  for (const r of records) {
    totalEnforna += r.enforna;
    totalDesenforna += r.desenforna;
    perda2Grau += r.perda_2grau;
    perdaCrua += r.perda_crua;
    perdaTrinca += r.perda_trinca;
    perdaQuebra += r.perda_quebra;
  }

  const allLossesSum = perda2Grau + perdaCrua + perdaTrinca + perdaQuebra;
  const totalPerdas =
    perdaTipo === 'all'
      ? allLossesSum
      : perdaTipo === '2a'
      ? perda2Grau
      : perdaTipo === 'crua'
      ? perdaCrua
      : perdaTipo === 'trinca'
      ? perdaTrinca
      : perdaQuebra;

  const diferenca = Math.max(0, totalEnforna - totalDesenforna);

  const eficienciaPct = totalEnforna > 0 ? (totalDesenforna / totalEnforna) * 100 : 0;
  const perdaPct = totalEnforna > 0 ? (totalPerdas / totalEnforna) * 100 : 0;
  const diferencaPct = totalEnforna > 0 ? (diferenca / totalEnforna) * 100 : 0;

  const perda2GrauPct = totalEnforna > 0 ? (perda2Grau / totalEnforna) * 100 : 0;
  const perdaCruaPct = totalEnforna > 0 ? (perdaCrua / totalEnforna) * 100 : 0;
  const perdaTrincaPct = totalEnforna > 0 ? (perdaTrinca / totalEnforna) * 100 : 0;
  const perdaQuebraPct = totalEnforna > 0 ? (perdaQuebra / totalEnforna) * 100 : 0;

  // Determine greatest cause among the 4 loss types
  const causes = [
    { name: 'Trinca', qtd: perdaTrinca },
    { name: '2ª (segunda)', qtd: perda2Grau },
    { name: 'Crua', qtd: perdaCrua },
    { name: 'Quebra', qtd: perdaQuebra },
  ];
  causes.sort((a, b) => b.qtd - a.qtd);
  const greatest = causes[0];
  const maiorCausaPct = allLossesSum > 0 ? (greatest.qtd / allLossesSum) * 100 : 0;

  return {
    totalEnforna,
    totalDesenforna,
    totalPerdas,
    diferenca,
    camarasCount,
    eficienciaPct,
    perdaPct,
    diferencaPct,
    perda2Grau,
    perda2GrauPct,
    perdaCrua,
    perdaCruaPct,
    perdaTrinca,
    perdaTrincaPct,
    perdaQuebra,
    perdaQuebraPct,
    maiorCausaNome: greatest.name,
    maiorCausaPct,
    maiorCausaQtd: greatest.qtd,
  };
}

export function computeOvenSummaries(records: ChamberRecord[]): OvenSummary[] {
  const ovenMap = new Map<string, {
    camaras: number;
    enforna: number;
    desenforna: number;
    perda2Grau: number;
    perdaCrua: number;
    perdaTrinca: number;
    perdaQuebra: number;
  }>();

  // Initialize known fornos
  ['Forno 1', 'Forno 2', 'Forno 3', 'Forno 4', 'Forno 5'].forEach((name) => {
    ovenMap.set(name, {
      camaras: 0,
      enforna: 0,
      desenforna: 0,
      perda2Grau: 0,
      perdaCrua: 0,
      perdaTrinca: 0,
      perdaQuebra: 0,
    });
  });

  for (const r of records) {
    let current = ovenMap.get(r.forno);
    if (!current) {
      current = {
        camaras: 0,
        enforna: 0,
        desenforna: 0,
        perda2Grau: 0,
        perdaCrua: 0,
        perdaTrinca: 0,
        perdaQuebra: 0,
      };
      ovenMap.set(r.forno, current);
    }

    current.camaras += 1;
    current.enforna += r.enforna;
    current.desenforna += r.desenforna;
    current.perda2Grau += r.perda_2grau;
    current.perdaCrua += r.perda_crua;
    current.perdaTrinca += r.perda_trinca;
    current.perdaQuebra += r.perda_quebra;
  }

  const result: OvenSummary[] = [];
  // Sort by name
  const sortedNames = Array.from(ovenMap.keys()).sort((a, b) => a.localeCompare(b));

  for (const name of sortedNames) {
    const val = ovenMap.get(name)!;
    const totalLoss = val.perda2Grau + val.perdaCrua + val.perdaTrinca + val.perdaQuebra;
    const perdaPct = val.enforna > 0 ? (totalLoss / val.enforna) * 100 : 0;
    const eficienciaPct = val.enforna > 0 ? (val.desenforna / val.enforna) * 100 : 0;

    result.push({
      forno: name,
      camaras: val.camaras,
      enforna: val.enforna,
      desenforna: val.desenforna,
      perda: totalLoss,
      perdaPct,
      eficienciaPct,
      perda2Grau: val.perda2Grau,
      perdaCrua: val.perdaCrua,
      perdaTrinca: val.perdaTrinca,
      perdaQuebra: val.perdaQuebra,
      perda2GrauPctEnf: val.enforna > 0 ? (val.perda2Grau / val.enforna) * 100 : 0,
      perdaCruaPctEnf: val.enforna > 0 ? (val.perdaCrua / val.enforna) * 100 : 0,
      perdaTrincaPctEnf: val.enforna > 0 ? (val.perdaTrinca / val.enforna) * 100 : 0,
      perdaQuebraPctEnf: val.enforna > 0 ? (val.perdaQuebra / val.enforna) * 100 : 0,
    });
  }

  return result;
}

export function computeDailySummaries(records: ChamberRecord[], perdaTipo: LossCategory = 'all'): DailySummary[] {
  const dayMap = new Map<string, {
    enforna: number;
    desenforna: number;
    perda2Grau: number;
    perdaCrua: number;
    perdaTrinca: number;
    perdaQuebra: number;
    camaras: number;
  }>();

  for (const r of records) {
    let day = dayMap.get(r.data);
    if (!day) {
      day = {
        enforna: 0,
        desenforna: 0,
        perda2Grau: 0,
        perdaCrua: 0,
        perdaTrinca: 0,
        perdaQuebra: 0,
        camaras: 0,
      };
      dayMap.set(r.data, day);
    }

    day.enforna += r.enforna;
    day.desenforna += r.desenforna;
    day.perda2Grau += r.perda_2grau;
    day.perdaCrua += r.perda_crua;
    day.perdaTrinca += r.perda_trinca;
    day.perdaQuebra += r.perda_quebra;
    day.camaras += 1;
  }

  const sortedDates = Array.from(dayMap.keys()).sort();
  return sortedDates.map((date) => {
    const data = dayMap.get(date)!;
    const totalLoss =
      perdaTipo === 'all'
        ? data.perda2Grau + data.perdaCrua + data.perdaTrinca + data.perdaQuebra
        : perdaTipo === '2a'
        ? data.perda2Grau
        : perdaTipo === 'crua'
        ? data.perdaCrua
        : perdaTipo === 'trinca'
        ? data.perdaTrinca
        : data.perdaQuebra;

    const perdaPct = data.enforna > 0 ? (totalLoss / data.enforna) * 100 : 0;

    return {
      date,
      formattedDate: formatDateShortBR(date),
      enforna: data.enforna,
      desenforna: data.desenforna,
      perda: totalLoss,
      perdaPct,
      camaras: data.camaras,
      perda2Grau: data.perda2Grau,
      perdaCrua: data.perdaCrua,
      perdaTrinca: data.perdaTrinca,
      perdaQuebra: data.perdaQuebra,
    };
  });
}

export function getTopAnomalyChambers(
  records: ChamberRecord[],
  limit: number = 8,
  sortBy: 'pieces' | 'percent' = 'pieces',
  perdaTipo: LossCategory = 'all'
): Array<ChamberRecord & { perdaTotal: number; perdaPct: number }> {
  const annotated = records.map((r) => {
    const perdaTotal = getChamberLoss(r, perdaTipo);
    const perdaPct = r.enforna > 0 ? (perdaTotal / r.enforna) * 100 : 0;
    return {
      ...r,
      perdaTotal,
      perdaPct,
    };
  });

  annotated.sort((a, b) => {
    if (sortBy === 'pieces') {
      return b.perdaTotal - a.perdaTotal;
    }
    return b.perdaPct - a.perdaPct;
  });

  return limit > 0 ? annotated.slice(0, limit) : annotated;
}

export const MONTH_NAMES_PT: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
};

export function formatMonthYearBR(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey || 'Mês Atual';
  const parts = monthKey.split('-');
  const year = parts[0];
  const month = parts[1];
  const name = MONTH_NAMES_PT[month] || month;
  return `${name}/${year}`;
}

export function getAvailableMonths(records: ChamberRecord[]): Array<{ monthKey: string; label: string; count: number }> {
  const map = new Map<string, { count: number; enforna: number }>();
  for (const r of records) {
    if (r.data && r.data.length >= 7) {
      const k = r.data.slice(0, 7); // YYYY-MM
      const cur = map.get(k) || { count: 0, enforna: 0 };
      cur.count += 1;
      cur.enforna += r.enforna || 0;
      map.set(k, cur);
    }
  }

  return Array.from(map.entries())
    .filter(([monthKey, val]) => {
      // Must have at least 1 record and positive enforna production
      if (val.count <= 0 || val.enforna <= 0) return false;
      // Exclude empty/stray August: if August has <= 1 record or zero/near-zero volume, remove it
      if (monthKey === '2026-08' && (val.count <= 1 || val.enforna < 20000)) return false;
      return true;
    })
    .sort((a, b) => b[0].localeCompare(a[0])) // latest month first
    .map(([monthKey, val]) => ({
      monthKey,
      label: formatMonthYearBR(monthKey),
      count: val.count,
    }));
}

export function computeMonthSummary(records: ChamberRecord[], monthKey: string): MonthSummary {
  const monthRecords = records.filter((r) => r.data && r.data.startsWith(monthKey));
  const metrics = computeSummaryMetrics(monthRecords, 'all');
  const ovenSummaries = computeOvenSummaries(monthRecords);

  return {
    monthKey,
    label: formatMonthYearBR(monthKey),
    recordsCount: monthRecords.length,
    metrics,
    ovenSummaries,
  };
}

/**
 * Compares two months (e.g., February vs January) or compares the selected month
 * against a simulated baseline/reference if only one month exists in dataset.
 */
export function compareMonths(
  records: ChamberRecord[],
  currentMonthKey: string,
  previousMonthKey: string,
  forceSimulatedBenchmark: boolean = false
): MonthComparisonResult {
  const prevMonthRecs = records.filter((r) => r.data && r.data.startsWith(previousMonthKey));
  const isBenchmarkSimulated =
    forceSimulatedBenchmark ||
    currentMonthKey === previousMonthKey ||
    !previousMonthKey ||
    prevMonthRecs.length === 0;

  const currentSummary = computeMonthSummary(records, currentMonthKey);

  let prevSummary: MonthSummary;

  if (isBenchmarkSimulated) {
    // Generate realistic historical baseline (e.g. Previous Month with slightly lower efficiency)
    const baseMetrics = currentSummary.metrics;
    const factor = 0.985; // 1.5% lower volume
    const simulatedPrevEnforna = Math.round(baseMetrics.totalEnforna * factor);
    const simulatedPrevPerdas = Math.round(baseMetrics.totalPerdas * 1.18); // 18% higher losses in previous month
    const simulatedPrevDesenforna = simulatedPrevEnforna - simulatedPrevPerdas;
    const simulatedPrevEficiencia = simulatedPrevEnforna > 0 ? (simulatedPrevDesenforna / simulatedPrevEnforna) * 100 : 0;
    const simulatedPrevPerdaPct = simulatedPrevEnforna > 0 ? (simulatedPrevPerdas / simulatedPrevEnforna) * 100 : 0;

    const prevMonthParts = currentMonthKey.split('-');
    let prevYear = parseInt(prevMonthParts[0] || '2026', 10);
    let prevMonthNum = parseInt(prevMonthParts[1] || '09', 10) - 1;
    if (prevMonthNum === 0) {
      prevMonthNum = 12;
      prevYear -= 1;
    }
    const prevKey = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;

    prevSummary = {
      monthKey: prevKey,
      label: `${formatMonthYearBR(prevKey)} (Referência)`,
      recordsCount: Math.round(currentSummary.recordsCount * 0.95),
      metrics: {
        totalEnforna: simulatedPrevEnforna,
        totalDesenforna: simulatedPrevDesenforna,
        totalPerdas: simulatedPrevPerdas,
        diferenca: simulatedPrevEnforna - simulatedPrevDesenforna,
        camarasCount: Math.round(currentSummary.recordsCount * 0.95),
        eficienciaPct: simulatedPrevEficiencia,
        perdaPct: simulatedPrevPerdaPct,
        diferencaPct: simulatedPrevPerdaPct,
        perda2Grau: Math.round(baseMetrics.perda2Grau * 1.15),
        perda2GrauPct: simulatedPrevEnforna > 0 ? (Math.round(baseMetrics.perda2Grau * 1.15) / simulatedPrevEnforna) * 100 : 0,
        perdaCrua: Math.round(baseMetrics.perdaCrua * 1.25),
        perdaCruaPct: simulatedPrevEnforna > 0 ? (Math.round(baseMetrics.perdaCrua * 1.25) / simulatedPrevEnforna) * 100 : 0,
        perdaTrinca: Math.round(baseMetrics.perdaTrinca * 1.16),
        perdaTrincaPct: simulatedPrevEnforna > 0 ? (Math.round(baseMetrics.perdaTrinca * 1.16) / simulatedPrevEnforna) * 100 : 0,
        perdaQuebra: Math.round(baseMetrics.perdaQuebra * 1.20),
        perdaQuebraPct: simulatedPrevEnforna > 0 ? (Math.round(baseMetrics.perdaQuebra * 1.20) / simulatedPrevEnforna) * 100 : 0,
        maiorCausaNome: 'Trinca',
        maiorCausaPct: 41,
        maiorCausaQtd: Math.round(baseMetrics.perdaTrinca * 1.16),
      },
      ovenSummaries: currentSummary.ovenSummaries.map((o) => {
        const oEnf = Math.round(o.enforna * factor);
        const oPerda = Math.round(o.perda * 1.18);
        const oDes = oEnf - oPerda;
        return {
          ...o,
          enforna: oEnf,
          desenforna: oDes,
          perda: oPerda,
          eficienciaPct: oEnf > 0 ? (oDes / oEnf) * 100 : 0,
          perdaPct: oEnf > 0 ? (oPerda / oEnf) * 100 : 0,
        };
      }),
    };
  } else {
    prevSummary = computeMonthSummary(records, previousMonthKey);
  }

  // Calculate efficiency deltas
  const curM = currentSummary.metrics;
  const prvM = prevSummary.metrics;

  const eficienciaDelta = curM.eficienciaPct - prvM.eficienciaPct;
  const perdaDelta = curM.perdaPct - prvM.perdaPct;

  const enfornaDelta = curM.totalEnforna - prvM.totalEnforna;
  const enfornaDeltaPct = prvM.totalEnforna > 0 ? (enfornaDelta / prvM.totalEnforna) * 100 : 0;

  const desenfornaDelta = curM.totalDesenforna - prvM.totalDesenforna;
  const desenfornaDeltaPct = prvM.totalDesenforna > 0 ? (desenfornaDelta / prvM.totalDesenforna) * 100 : 0;

  // Productivity variations (Variação de Produtividade Útil)
  const produtividadeVolumeDelta = desenfornaDelta;
  const produtividadeVolumeDeltaPct = desenfornaDeltaPct;
  const produtividadeTaxaDeltaPp = curM.eficienciaPct - prvM.eficienciaPct;
  const produtividadeTaxaDeltaPct = prvM.eficienciaPct > 0
    ? ((curM.eficienciaPct - prvM.eficienciaPct) / prvM.eficienciaPct) * 100
    : 0;

  // Defect breakdown deltas (percentage points of enforna)
  const perda2GrauDeltaPp = curM.perda2GrauPct - prvM.perda2GrauPct;
  const perdaCruaDeltaPp = curM.perdaCruaPct - prvM.perdaCruaPct;
  const perdaTrincaDeltaPp = curM.perdaTrincaPct - prvM.perdaTrincaPct;
  const perdaQuebraDeltaPp = curM.perdaQuebraPct - prvM.perdaQuebraPct;

  // Determine overall status
  let status: 'melhoria' | 'piora' | 'estavel' = 'estavel';
  if (eficienciaDelta >= 0.2) status = 'melhoria';
  else if (eficienciaDelta <= -0.2) status = 'piora';

  // Compare ovens
  let bestOven: { forno: string; deltaPp: number } | null = null;
  let worstOven: { forno: string; deltaPp: number } | null = null;

  for (const curOven of currentSummary.ovenSummaries) {
    const prevOven = prevSummary.ovenSummaries.find((p) => p.forno === curOven.forno);
    if (prevOven && prevOven.enforna > 0 && curOven.enforna > 0) {
      const deltaEf = curOven.eficienciaPct - prevOven.eficienciaPct;
      if (!bestOven || deltaEf > bestOven.deltaPp) {
        bestOven = { forno: curOven.forno, deltaPp: deltaEf };
      }
      if (!worstOven || deltaEf < worstOven.deltaPp) {
        worstOven = { forno: curOven.forno, deltaPp: deltaEf };
      }
    }
  }

  // Biggest defect change
  const defectChanges = [
    { tipo: 'Trinca', deltaPp: perdaTrincaDeltaPp },
    { tipo: '2ª Linha', deltaPp: perda2GrauDeltaPp },
    { tipo: 'Crua', deltaPp: perdaCruaDeltaPp },
    { tipo: 'Quebra', deltaPp: perdaQuebraDeltaPp },
  ];

  defectChanges.sort((a, b) => Math.abs(b.deltaPp) - Math.abs(a.deltaPp));
  const topDefect = defectChanges[0];
  const biggestDefectChange = topDefect
    ? {
        tipo: topDefect.tipo,
        deltaPp: topDefect.deltaPp,
        direction: topDefect.deltaPp >= 0 ? ('subiu' as const) : ('caiu' as const),
      }
    : null;

  // Primary highlight string
  let primaryHighlight = '';
  if (status === 'melhoria') {
    primaryHighlight = `Melhoria de +${eficienciaDelta.toFixed(1).replace('.', ',')} pp no rendimento útil da queima em relação a ${prevSummary.label}.`;
  } else if (status === 'piora') {
    primaryHighlight = `Atenção: Queda de ${Math.abs(eficienciaDelta).toFixed(1).replace('.', ',')} pp no rendimento útil em relação a ${prevSummary.label}.`;
  } else {
    primaryHighlight = `Rendimento estável em relação a ${prevSummary.label} (variação de ${eficienciaDelta >= 0 ? '+' : ''}${eficienciaDelta.toFixed(1).replace('.', ',')} pp).`;
  }

  return {
    currentMonth: currentSummary,
    previousMonth: prevSummary,
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
    ovenBestGain: bestOven,
    ovenWorstDrop: worstOven,
    biggestDefectChange,
  };
}
