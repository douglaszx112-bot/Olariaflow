export interface ChamberRecord {
  id: string;
  data: string; // YYYY-MM-DD
  forno: string; // e.g. "Forno 1", "Forno 2"
  camara: number | string;
  enforna: number;
  desenforna: number;
  perda_2grau: number;
  perda_crua: number;
  perda_trinca: number;
  perda_quebra: number;
  diferenca?: number; // Ajuste de estoque (peça +/-) da coluna A MENOS/A MAIS — NÃO é perda de produção
}

export type DashboardTab = 'visao-geral' | 'comparativo' | 'perdas' | 'graficos';

export type AutoRefreshOption = '30s' | '1min' | '5min' | 'off';

export interface AlertThresholds {
  criticalLossPct: number; // e.g. 15 (%)
  warningLossPct: number;  // e.g. 10 (%)
}

export type LossCategory = 'all' | '2a' | 'crua' | 'trinca' | 'quebra';

export interface FilterState {
  forno: string; // 'all' or specific oven name
  perdaTipo: LossCategory;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  searchTerm: string;
  selectedMonth: string; // 'all' or 'YYYY-MM' (e.g. '2026-09')
}

export interface MonthOption {
  monthKey: string; // 'YYYY-MM'
  label: string; // e.g. 'Setembro/2026'
  count: number;
}

export interface SummaryMetrics {
  totalEnforna: number;
  totalDesenforna: number;
  totalPerdas: number;
  diferenca: number;
  camarasCount: number;
  eficienciaPct: number;
  perdaPct: number;
  diferencaPct: number;
  perda2Grau: number;
  perda2GrauPct: number;
  perdaCrua: number;
  perdaCruaPct: number;
  perdaTrinca: number;
  perdaTrincaPct: number;
  perdaQuebra: number;
  perdaQuebraPct: number;
  maiorCausaNome: string;
  maiorCausaPct: number;
  maiorCausaQtd: number;
}

export interface OvenSummary {
  forno: string;
  camaras: number;
  enforna: number;
  desenforna: number;
  perda: number;
  perdaPct: number;
  eficienciaPct: number;
  perda2Grau: number;
  perdaCrua: number;
  perdaTrinca: number;
  perdaQuebra: number;
  perda2GrauPctEnf: number;
  perdaCruaPctEnf: number;
  perdaTrincaPctEnf: number;
  perdaQuebraPctEnf: number;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  formattedDate: string; // DD/MM
  enforna: number;
  desenforna: number;
  perda: number;
  perdaPct: number;
  camaras: number;
  perda2Grau: number;
  perdaCrua: number;
  perdaTrinca: number;
  perdaQuebra: number;
}

export interface MonthSummary {
  monthKey: string; // YYYY-MM
  label: string; // e.g. "Fevereiro 2026", "Janeiro 2026"
  recordsCount: number;
  metrics: SummaryMetrics;
  ovenSummaries: OvenSummary[];
}

export interface MonthComparisonResult {
  currentMonth: MonthSummary;
  previousMonth: MonthSummary;
  isBenchmarkSimulated: boolean;

  // Efficiency delta (current - previous in percentage points)
  eficienciaDelta: number; // positive is improvement
  perdaDelta: number; // negative is improvement
  enfornaDelta: number;
  enfornaDeltaPct: number;
  desenfornaDelta: number;
  desenfornaDeltaPct: number;

  // Productivity variation (Variação percentual de produtividade)
  produtividadeVolumeDelta: number; // Peças desenfornadas úteis (B - A)
  produtividadeVolumeDeltaPct: number; // Variação % do volume útil
  produtividadeTaxaDeltaPp: number; // Delta pp da eficiência/rendimento (B - A)
  produtividadeTaxaDeltaPct: number; // Variação % relativa da eficiência útil

  // Defect breakdown deltas (pp = percentage points on enforna)
  perda2GrauDeltaPp: number;
  perdaCruaDeltaPp: number;
  perdaTrincaDeltaPp: number;
  perdaQuebraDeltaPp: number;

  // Executive summary insights
  status: 'melhoria' | 'piora' | 'estavel';
  primaryHighlight: string;
  ovenBestGain: { forno: string; deltaPp: number } | null;
  ovenWorstDrop: { forno: string; deltaPp: number } | null;
  biggestDefectChange: { tipo: string; deltaPp: number; direction: 'subiu' | 'caiu' } | null;
}
