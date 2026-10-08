import * as XLSX from 'xlsx';
import { ChamberRecord, SummaryMetrics } from '../types';
import { computeSummaryMetrics, formatDateBR, formatNumberBR, formatPercentBR } from './calculations';

export interface ColumnMapping {
  dataColIndex: number;
  fornoColIndex: number;
  camaraColIndex: number;
  enfornaColIndex: number;
  desenfornaColIndex: number;
  diferencaColIndex: number;

  // Ajuste de Estoque / Reconciliação (A MENOS, A MAIS, Peça +/-) — NÃO é perda de produção
  aMenosColIndex: number;
  aMaisColIndex: number;
  pecasMaisMenosColIndex: number;

  // Pieces columns
  totalPerdasColIndex: number;
  perda2GrauColIndex: number;
  perdaCruaColIndex: number;
  perdaTrincaColIndex: number;
  perdaQuebraColIndex: number;

  // Percentage columns (if sheet has dedicated % columns)
  totalPerdasPctColIndex: number;
  perda2GrauPctColIndex: number;
  perdaCruaPctColIndex: number;
  perdaTrincaPctColIndex: number;
  perdaQuebraPctColIndex: number;
}

export interface SheetParseResult {
  sheetName: string;
  isOvenSheet: boolean;
  ovenName: string;
  headerRowIndex: number;
  headers: string[];
  records: ChamberRecord[];
  columnMapping: ColumnMapping;
  rowCount: number;
  totalEnforna: number;
  totalPerda: number;
  discardedRowsCount: number;
}

export interface XlsxParseResult {
  records: ChamberRecord[];
  metrics: SummaryMetrics;
  fileName: string;
  sheetNames: string[];
  activeSheetName: string;
  rawTargetSheetName?: string;
  totalRowsProcessed: number;
  discardedRowsCount: number;
  sheetResults: SheetParseResult[];
  ovenBreakdown: Array<{
    forno: string;
    camaras: number;
    enforna: number;
    desenforna: number;
    perda: number;
    perdaPct: number;
  }>;
  warnings: string[];
  minDate: string;
  maxDate: string;
  detectedMonthKey?: string;
}

// Clean and normalize strings for matching column or sheet names
export function cleanKey(k: unknown): string {
  if (k === null || k === undefined) return '';
  return String(k)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Detect if a string represents a percentage indicator
export function isPercentageHeader(rawStr: unknown): boolean {
  const s = String(rawStr || '').toLowerCase();
  return s.includes('%') || s.includes('pct') || s.includes('taxa') || s.includes('perc') || s.includes('porcent');
}

// Helper to detect month from text or month names in Portuguese
export const MONTH_NAMES_MAP: Record<string, string> = {
  janeiro: '01',
  jan: '01',
  fevereiro: '02',
  fev: '02',
  marco: '03',
  mar: '03',
  marco2: '03',
  abril: '04',
  abr: '04',
  maio: '05',
  mai: '05',
  junho: '06',
  jun: '06',
  julho: '07',
  jul: '07',
  agosto: '08',
  ago: '08',
  setembro: '09',
  set: '09',
  outubro: '10',
  out: '10',
  novembro: '11',
  nov: '11',
  dezembro: '12',
  dez: '12',
};

// Robust Excel date converter to YYYY-MM-DD
export function parseExcelDate(
  val: unknown,
  fallbackYear: number = new Date().getFullYear(),
  fallbackMonth: string = String(new Date().getMonth() + 1).padStart(2, '0'),
  forceMonthYear: boolean = false
): string {
  const currentNow = new Date();
  const safeYear = fallbackYear || currentNow.getFullYear();
  const safeMonth = fallbackMonth || String(currentNow.getMonth() + 1).padStart(2, '0');
  const defaultDate = `${safeYear}-${safeMonth}-01`;

  if (!val) return defaultDate;

  // 1. If explicit forceMonthYear is enabled (e.g. workbook month locked to August/2026):
  // We extract the day and strictly enforce safeYear and safeMonth
  if (forceMonthYear) {
    let day = 1;
    if (val instanceof Date && !isNaN(val.getTime())) {
      day = val.getUTCHours() >= 20 ? val.getDate() : val.getUTCDate();
    } else if (typeof val === 'number') {
      if (val >= 1 && val <= 31) {
        day = Math.round(val);
      } else if (val > 40000 && val < 60000) {
        const jsDate = new Date(new Date(Date.UTC(1899, 11, 30)).getTime() + val * 86400000);
        day = jsDate.getUTCDate();
      }
    } else if (typeof val === 'string') {
      const s = val.trim();
      const m = s.match(/^(\d{1,2})/);
      if (m) {
        day = parseInt(m[1], 10);
      }
    }
    const clampedDay = Math.min(31, Math.max(1, isNaN(day) ? 1 : day));
    return `${safeYear}-${safeMonth}-${String(clampedDay).padStart(2, '0')}`;
  }

  // 2. Normal parsing (with robust Brazilian DD/MM/YYYY handling)
  if (val instanceof Date && !isNaN(val.getTime())) {
    // Robustly handle timezone offsets: if hours >= 20, the local date is the intended day
    if (val.getUTCHours() >= 20) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof val === 'number') {
    // If it's a day of month (1 to 31)
    if (val >= 1 && val <= 31) {
      const d = String(Math.round(val)).padStart(2, '0');
      return `${safeYear}-${safeMonth}-${d}`;
    }
    // Excel date serial number (e.g. 46280 for year 2026)
    if (val > 40000 && val < 60000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const jsDate = new Date(excelEpoch.getTime() + val * 86400000);
      if (!isNaN(jsDate.getTime()) && jsDate.getUTCFullYear() >= 2020 && jsDate.getUTCFullYear() <= 2040) {
        const y = jsDate.getUTCFullYear();
        const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(jsDate.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return defaultDate;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return s;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0');
      const month = ddmmyyyy[2].padStart(2, '0');
      let year = ddmmyyyy[3];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }

    // DD/MM
    const ddmm = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (ddmm) {
      const day = ddmm[1].padStart(2, '0');
      const month = ddmm[2].padStart(2, '0');
      return `${safeYear}-${month}-${day}`;
    }

    // Single day number string: "1" to "31"
    const singleDay = s.match(/^(\d{1,2})$/);
    if (singleDay) {
      const d = parseInt(singleDay[1], 10);
      if (d >= 1 && d <= 31) {
        return `${safeYear}-${safeMonth}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  return defaultDate;
}

/**
 * Robust piece count parser that handles:
 * - Direct numbers from Excel: 28300, 1500, 0
 * - String numbers with Brazilian format: "28.300", "28.300,00" -> 28300
 * - String numbers with US format: "28,300", "28,300.00" -> 28300
 * - Percentages (e.g. 0.05 or "5%"): calculates pieces based on enfornaReference
 */
export function parsePieceCount(val: unknown, enfornaReference: number = 0, allowNegative: boolean = false): number {
  if (val === null || val === undefined) return 0;

  // Direct JavaScript number (most common when raw: true in sheetjs)
  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    // Decimal between -1 and 1 represents a ratio/percentage (e.g. 0.033 for 3.3%)
    if (Math.abs(val) > 0 && Math.abs(val) < 1 && enfornaReference > 0) {
      const res = Math.round(val * enfornaReference);
      return allowNegative ? res : Math.max(0, res);
    }
    return allowNegative ? Math.round(val) : Math.max(0, Math.round(val));
  }

  // String formatting
  if (typeof val === 'string') {
    let s = val.trim();
    if (!s) return 0;
    const isNegative = s.includes('-') || (s.startsWith('(') && s.endsWith(')'));

    // Has percentage symbol, e.g. "3,3%" or "3.3%"
    if (s.includes('%')) {
      const numStr = s.replace('%', '').replace(/\s/g, '').replace(',', '.');
      const pct = parseFloat(numStr);
      if (!isNaN(pct) && enfornaReference > 0) {
        const res = Math.round((pct / 100) * enfornaReference);
        return (isNegative && allowNegative) ? -Math.abs(res) : Math.max(0, res);
      }
      return 0;
    }

    // Strip currency symbol R$, spaces, non-numeric except . and , and -
    const cleaned = s.replace(/[^0-9.,-]/g, '').trim();
    if (!cleaned) return 0;

    // Both dot and comma present
    if (cleaned.includes('.') && cleaned.includes(',')) {
      const dotIndex = cleaned.lastIndexOf('.');
      const commaIndex = cleaned.lastIndexOf(',');
      if (commaIndex > dotIndex) {
        // Brazilian format: 28.300,50 -> dot is thousand, comma is decimal
        const num = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
        if (isNaN(num)) return 0;
        const res = Math.round(num);
        return (isNegative && allowNegative) ? -Math.abs(res) : Math.max(0, res);
      } else {
        // US format: 28,300.50 -> comma is thousand, dot is decimal
        const num = parseFloat(cleaned.replace(/,/g, ''));
        if (isNaN(num)) return 0;
        const res = Math.round(num);
        return (isNegative && allowNegative) ? -Math.abs(res) : Math.max(0, res);
      }
    }

    // Only comma present
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      // Check if comma is thousands separator: e.g. "28,300" or "120,000" or "1,500"
      if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
        const num = parseFloat(cleaned.replace(/,/g, ''));
        if (isNaN(num)) return 0;
        const res = Math.round(num);
        return (isNegative && allowNegative) ? -Math.abs(res) : Math.max(0, res);
      }
      // Otherwise comma is decimal: e.g. "15,5" or "0,03"
      const num = parseFloat(cleaned.replace(',', '.'));
      if (!isNaN(num)) {
        let res = Math.round(num);
        if (Math.abs(num) > 0 && Math.abs(num) < 1 && enfornaReference > 0) {
          res = Math.round(num * enfornaReference);
        }
        return (isNegative && allowNegative) ? -Math.abs(res) : Math.max(0, res);
      }
    }

    // Only dot present
    if (cleaned.includes('.') && !cleaned.includes(',')) {
      // Check if dot is thousands separator: e.g. "28.300" or "120.000" or "1.500"
      if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
        const num = parseFloat(cleaned.replace(/\./g, ''));
        if (isNaN(num)) return 0;
        const res = Math.round(num);
        return (isNegative && allowNegative) ? -Math.abs(res) : Math.max(0, res);
      }
      // Otherwise dot is decimal
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        let res = Math.round(num);
        if (Math.abs(num) > 0 && Math.abs(num) < 1 && enfornaReference > 0) {
          res = Math.round(num * enfornaReference);
        }
        return (isNegative && allowNegative) ? -Math.abs(res) : Math.max(0, res);
      }
    }

    // Plain integer string
    const plainNum = parseFloat(cleaned);
    if (!isNaN(plainNum)) {
      const res = Math.round(plainNum);
      return (isNegative && allowNegative) ? -Math.abs(res) : Math.max(0, res);
    }
  }

  return 0;
}

// Standardize oven names to "Forno 1", "Forno 2", etc.
export function normalizeOvenName(val: unknown): string {
  if (!val) return 'Forno 1';
  const str = String(val).trim();
  const lower = str.toLowerCase();

  // Explicit patterns: "Forno 1", "Forno 01", "F1", "F01", "F-1", "Forno-1", "FN 1", "1º Forno"
  const match = lower.match(/(?:forno|kiln|fn|f)[_\-\s]*0?([1-9][0-9]?)\b/i) ||
                lower.match(/\b([1-9][0-9]?)[º°\s]*(?:forno|kiln)\b/i);
  if (match) {
    return `Forno ${parseInt(match[1], 10)}`;
  }

  // Exact number 1 to 99 (e.g. cell just has 1, 2, 3...)
  const numMatch = str.match(/^0?([1-9][0-9]?)$/);
  if (numMatch) {
    return `Forno ${parseInt(numMatch[1], 10)}`;
  }

  if (/^forno\s+\d+$/i.test(str)) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // If already standard name
  if (['Forno 1', 'Forno 2', 'Forno 3', 'Forno 4', 'Forno 5', 'Forno 6', 'Forno 7', 'Forno 8'].includes(str)) {
    return str;
  }

  return 'Forno 1';
}

// Check if a sheet is an individual oven sheet
export function isOvenSheetName(name: string): boolean {
  const clean = cleanKey(name);
  if (clean.includes('forno')) return true;
  if (/^f0?[1-9][0-9]?$/i.test(clean)) return true;
  if (/^0?[1-9][0-9]?$/.test(clean)) return true; // Sheets named simply "1", "2", "3", "4", "5", "01"
  if (clean.includes('fn') || clean.includes('kiln') || clean.includes('queima')) return true;
  return false;
}

// Check if a row in the spreadsheet is a summary/total row
export function isSummaryRow(row: unknown[]): boolean {
  if (!row || row.length === 0) return true;

  // Safeguard: Check if this row is actually a genuine chamber data row
  // e.g. Has a numeric chamber 1..40 AND positive production pieces
  let hasValidChamberNum = false;
  let hasProductionPieces = false;
  for (let c = 0; c < Math.min(8, row.length); c++) {
    const val = row[c];
    if (typeof val === 'number') {
      if (Number.isInteger(val) && val >= 1 && val <= 40) hasValidChamberNum = true;
      if (val >= 1000 && val <= 120000) hasProductionPieces = true;
    }
  }

  // Inspect the first 4 columns for explicit summary labels
  for (let c = 0; c < Math.min(4, row.length); c++) {
    const rawVal = row[c];
    if (rawVal === null || rawVal === undefined) continue;
    const str = String(rawVal).trim().toLowerCase();
    if (!str) continue;

    const isExplicitSummaryLabel =
      /^(total|totais|subtotal|sub-total|sub\s+total|soma|somatorio|resumo|resumo\s+geral)(\s*[:\-]|\s+|$)/i.test(str) ||
      /\btotal\s+(geral|do\s+forno|mensal|acumulado|de\s+perdas|producao)\b/i.test(str) ||
      /\b(totalgeral|totalmensal|totaldoforno|somageral|totalizador)\b/i.test(cleanKey(str));

    if (isExplicitSummaryLabel) {
      if (hasValidChamberNum && hasProductionPieces && !str.startsWith('total geral') && !str.startsWith('total mensal')) {
        continue;
      }
      return true;
    }

    const norm = cleanKey(str);
    if (
      norm === 'total' ||
      norm === 'totais' ||
      norm === 'totalgeral' ||
      norm === 'totalmensal' ||
      norm === 'totaldoforno' ||
      norm === 'totalgeraldoforno' ||
      norm === 'totaldeperdas' ||
      norm === 'soma' ||
      norm === 'somatorio' ||
      norm === 'subtotal' ||
      norm === 'resumomensal'
    ) {
      if (hasValidChamberNum && hasProductionPieces) continue;
      return true;
    }
  }
  return false;
}

/**
 * Searches a 2D worksheet grid to automatically detect the header row index
 * and maps all columns, separating piece counts from percentage columns.
 */
export function detectHeaderRowAndMapping(grid: unknown[][]): {
  headerRowIndex: number;
  headers: string[];
  mapping: ColumnMapping;
} {
  let bestRowIndex = 0;
  let bestScore = -1;
  let bestMapping: ColumnMapping = {
    dataColIndex: -1,
    fornoColIndex: -1,
    camaraColIndex: -1,
    enfornaColIndex: -1,
    desenfornaColIndex: -1,
    diferencaColIndex: -1,
    aMenosColIndex: -1,
    aMaisColIndex: -1,
    pecasMaisMenosColIndex: -1,
    totalPerdasColIndex: -1,
    perda2GrauColIndex: -1,
    perdaCruaColIndex: -1,
    perdaTrincaColIndex: -1,
    perdaQuebraColIndex: -1,
    totalPerdasPctColIndex: -1,
    perda2GrauPctColIndex: -1,
    perdaCruaPctColIndex: -1,
    perdaTrincaPctColIndex: -1,
    perdaQuebraPctColIndex: -1,
  };

  const maxSearchRows = Math.min(25, grid.length);

  for (let r = 0; r < maxSearchRows; r++) {
    const row = grid[r] || [];
    if (row.length === 0) continue;

    let score = 0;
    const mapping: ColumnMapping = {
      dataColIndex: -1,
      fornoColIndex: -1,
      camaraColIndex: -1,
      enfornaColIndex: -1,
      desenfornaColIndex: -1,
      diferencaColIndex: -1,
      aMenosColIndex: -1,
      aMaisColIndex: -1,
      pecasMaisMenosColIndex: -1,
      totalPerdasColIndex: -1,
      perda2GrauColIndex: -1,
      perdaCruaColIndex: -1,
      perdaTrincaColIndex: -1,
      perdaQuebraColIndex: -1,
      totalPerdasPctColIndex: -1,
      perda2GrauPctColIndex: -1,
      perdaCruaPctColIndex: -1,
      perdaTrincaPctColIndex: -1,
      perdaQuebraPctColIndex: -1,
    };

    for (let c = 0; c < row.length; c++) {
      const rawCell = row[c];
      const rawStr = String(rawCell || '').trim();
      const rawLower = rawStr.toLowerCase();
      const cellText = cleanKey(rawCell);
      if (!cellText && !rawLower.includes('-+') && !rawLower.includes('+-') && !rawLower.includes('+/-')) continue;

      const isPct = isPercentageHeader(rawStr);

      // Check A MENOS (Ajuste de estoque físico negativo — NÃO é perda de produção)
      if (
        !isPct &&
        !cellText.includes('perda') &&
        !cellText.includes('trinca') &&
        !cellText.includes('quebra') &&
        !cellText.includes('crua') &&
        (
          cellText === 'amenos' ||
          cellText.includes('amenos') ||
          rawLower.includes('a menos') ||
          rawLower.includes('a -') ||
          cellText === 'falta' ||
          cellText.includes('falta')
        )
      ) {
        if (mapping.aMenosColIndex === -1) {
          mapping.aMenosColIndex = c;
          score += 4;
        }
      }

      // Check A MAIS (Ajuste de estoque físico positivo — NÃO é perda de produção)
      else if (
        !isPct &&
        !cellText.includes('perda') &&
        !cellText.includes('trinca') &&
        !cellText.includes('quebra') &&
        !cellText.includes('crua') &&
        (
          cellText === 'amais' ||
          cellText.includes('amais') ||
          rawLower.includes('a mais') ||
          rawLower.includes('a +') ||
          cellText === 'sobra' ||
          cellText.includes('sobra')
        )
      ) {
        if (mapping.aMaisColIndex === -1) {
          mapping.aMaisColIndex = c;
          score += 4;
        }
      }

      // Check PEÇA +/- ou PEÇAS -+ (Consolidado de ajuste/diferença de estoque — NÃO é perda de produção)
      else if (
        !isPct &&
        !cellText.includes('perda') &&
        !cellText.includes('trinca') &&
        !cellText.includes('quebra') &&
        !cellText.includes('crua') &&
        (
          rawLower.includes('-+') ||
          rawLower.includes('+-') ||
          rawLower.includes('+/-') ||
          rawLower.includes('-/+') ||
          rawLower.includes('pecas -') ||
          rawLower.includes('peças -') ||
          rawLower.includes('pecas +') ||
          rawLower.includes('peças +') ||
          rawLower.includes('peca -') ||
          rawLower.includes('peça -') ||
          rawLower.includes('peca +') ||
          rawLower.includes('peça +') ||
          cellText.includes('pecasmais') ||
          cellText.includes('pecasmenos') ||
          cellText.includes('pecas-+') ||
          cellText.includes('pecas+-') ||
          cellText.includes('ajusteestoque') ||
          cellText.includes('ajustediferenca') ||
          cellText.includes('diferencaestoque')
        )
      ) {
        if (mapping.pecasMaisMenosColIndex === -1) {
          mapping.pecasMaisMenosColIndex = c;
          score += 4;
        }
      }

      // 1. Check DATA
      else if (
        cellText === 'data' ||
        cellText === 'dia' ||
        cellText === 'date' ||
        cellText.includes('dataprod') ||
        cellText.includes('dataqueima')
      ) {
        if (mapping.dataColIndex === -1) {
          mapping.dataColIndex = c;
          score += 4;
        }
      }

      // 3. Check FORNO
      else if (
        cellText === 'forno' ||
        cellText.includes('numforno') ||
        cellText.includes('fornoid') ||
        cellText === 'kiln'
      ) {
        if (mapping.fornoColIndex === -1) {
          mapping.fornoColIndex = c;
          score += 4;
        }
      }

      // 4. Check CAMARA
      else if (
        cellText === 'camara' ||
        cellText === 'cam' ||
        cellText.includes('numcamara') ||
        cellText === 'camaras' ||
        cellText === 'vagoneta' ||
        cellText === 'vag'
      ) {
        if (mapping.camaraColIndex === -1) {
          mapping.camaraColIndex = c;
          score += 4;
        }
      }

      // 5. Check ENFORNA (must NOT match if header is data, diferenca, saldo or peças -+)
      else if (
        !cellText.includes('acumulad') &&
        !cellText.includes('diferen') &&
        !cellText.includes('saldo') &&
        !cellText.includes('sobra') &&
        !cellText.includes('data') &&
        !cellText.includes('dia') &&
        !cellText.includes('dt') &&
        !rawLower.includes('data') &&
        !rawLower.includes('-+') &&
        !rawLower.includes('+-') &&
        !rawLower.includes('+/-') &&
        !rawLower.includes('-/+') &&
        !rawLower.includes('- +') &&
        !rawLower.includes('+ -') &&
        !cellText.includes('boa') &&
        !cellText.includes('1qualidade') &&
        !cellText.includes('1linha') &&
        !isPct &&
        (
          cellText.includes('enforna') ||
          cellText.includes('entrada') ||
          cellText.includes('carga') ||
          cellText.includes('queima') ||
          cellText.includes('pecasenf') ||
          (cellText.includes('pecas') && !cellText.includes('des') && !cellText.includes('sai') && !cellText.includes('boa')) ||
          (cellText === 'producao' && mapping.enfornaColIndex === -1 && mapping.desenfornaColIndex === -1) ||
          cellText === 'produzido' ||
          cellText === 'qtd' ||
          cellText === 'quantidade'
        )
      ) {
        if (mapping.enfornaColIndex === -1) {
          mapping.enfornaColIndex = c;
          score += 6;
        }
      }

      // 6. Check DESENFORNA (expands terms and excludes data or diferenca)
      else if (
        !cellText.includes('diferen') &&
        !cellText.includes('acumulad') &&
        !cellText.includes('saldo') &&
        !cellText.includes('data') &&
        !cellText.includes('dia') &&
        !cellText.includes('dt') &&
        !rawLower.includes('data') &&
        !rawLower.includes('-+') &&
        !rawLower.includes('+-') &&
        !rawLower.includes('+/-') &&
        !rawLower.includes('-/+') &&
        !cellText.includes('perda') &&
        !isPct &&
        (
          cellText.includes('desenforna') ||
          cellText.includes('desforna') ||
          cellText.includes('desenfornado') ||
          cellText.includes('desenfornados') ||
          cellText.includes('desenfornadas') ||
          cellText.includes('desenfornada') ||
          cellText.includes('saida') ||
          cellText.includes('boas') ||
          cellText.includes('boa') ||
          cellText.includes('producaoutil') ||
          cellText.includes('producaoliquida') ||
          cellText.includes('util') ||
          cellText.includes('1linha') ||
          cellText.includes('primeiralinha') ||
          cellText.includes('1qualidade') ||
          cellText.includes('primeiraqualidade') ||
          cellText.includes('1escolha') ||
          cellText.includes('comercial') ||
          cellText.includes('retirada') ||
          cellText.includes('retiradas') ||
          cellText.includes('retirado') ||
          cellText.includes('tijolobom') ||
          cellText.includes('telhaboa') ||
          cellText === '1a' ||
          cellText === '1' ||
          cellText === 'aproveitamento' ||
          (cellText === 'producao' && mapping.enfornaColIndex >= 0)
        )
      ) {
        if (mapping.desenfornaColIndex === -1) {
          mapping.desenfornaColIndex = c;
          score += 6;
        }
      }

      // Check 2ª GRAU / SEGUNDA
      else if (
        cellText.includes('2grau') ||
        cellText.includes('2linha') ||
        cellText.includes('segunda') ||
        cellText === '2a' ||
        cellText === '2' ||
        cellText === 'p2' ||
        cellText.includes('2qualidade') ||
        cellText.includes('2escolha')
      ) {
        if (isPct) {
          if (mapping.perda2GrauPctColIndex === -1) mapping.perda2GrauPctColIndex = c;
        } else {
          if (mapping.perda2GrauColIndex === -1) {
            mapping.perda2GrauColIndex = c;
            score += 3;
          }
        }
      }

      // Check CRUA
      else if (
        cellText.includes('crua') ||
        cellText.includes('cru') ||
        cellText === 'pcrua' ||
        cellText.includes('malcozid') ||
        cellText.includes('malqueimad')
      ) {
        if (isPct) {
          if (mapping.perdaCruaPctColIndex === -1) mapping.perdaCruaPctColIndex = c;
        } else {
          if (mapping.perdaCruaColIndex === -1) {
            mapping.perdaCruaColIndex = c;
            score += 3;
          }
        }
      }

      // Check TRINCA
      else if (
        cellText.includes('trinca') ||
        cellText.includes('rachad') ||
        cellText === 'ptrinca' ||
        cellText.includes('fissura')
      ) {
        if (isPct) {
          if (mapping.perdaTrincaPctColIndex === -1) mapping.perdaTrincaPctColIndex = c;
        } else {
          if (mapping.perdaTrincaColIndex === -1) {
            mapping.perdaTrincaColIndex = c;
            score += 3;
          }
        }
      }

      // Check QUEBRA (Distinguish piece count from percentage column!)
      else if (
        !cellText.includes('total') &&
        (
          cellText.includes('quebra') ||
          cellText.includes('caco') ||
          cellText.includes('quebrad') ||
          cellText === 'pquebra' ||
          cellText.includes('destruid')
        )
      ) {
        if (isPct) {
          if (mapping.perdaQuebraPctColIndex === -1) mapping.perdaQuebraPctColIndex = c;
        } else {
          if (mapping.perdaQuebraColIndex === -1) {
            mapping.perdaQuebraColIndex = c;
            score += 3;
          }
        }
      }

      // Check TOTAL PERDAS (inclui "PERDA POR CÂMARA")
      else if (
        !isPct &&
        !cellText.includes('diferen') &&
        !cellText.includes('saldo') &&
        !cellText.includes('sobra') &&
        (
          cellText.includes('totalperda') ||
          cellText.includes('perdatotal') ||
          cellText.includes('totaldeperda') ||
          cellText.includes('perdastotais') ||
          cellText.includes('perdaporcamara') ||
          cellText.includes('perdacamara') ||
          cellText.includes('perdas') ||
          cellText.includes('perda') ||
          cellText.includes('refugo') ||
          cellText.includes('defeito') ||
          cellText.includes('descarte') ||
          cellText.includes('avaria')
        )
      ) {
        if (isPct) {
          if (mapping.totalPerdasPctColIndex === -1) mapping.totalPerdasPctColIndex = c;
        } else {
          if (mapping.totalPerdasColIndex === -1) {
            mapping.totalPerdasColIndex = c;
            score += 4;
          }
        }
      }

      // Check DIFERENÇA / DIF / DIF. (diferença entre enforna e desenforna)
      else if (
        !isPct &&
        (
          cellText === 'diferenca' ||
          cellText === 'diferen' ||
          cellText === 'dif' ||
          cellText === 'diferencas' ||
          cellText.includes('diferenca')
        )
      ) {
        if (mapping.diferencaColIndex === -1) {
          mapping.diferencaColIndex = c;
          score += 4;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = r;
      bestMapping = mapping;
    }
  }

  const headerRow = (grid[bestRowIndex] || []).map((h) => String(h || '').trim());

  // Also check if row directly below header (bestRowIndex + 1) has sub-headers
  if (bestRowIndex + 1 < grid.length) {
    const subRow = grid[bestRowIndex + 1] || [];
    for (let c = 0; c < subRow.length; c++) {
      const rawSub = subRow[c];
      const sub = cleanKey(rawSub);
      const isSubPct = isPercentageHeader(rawSub);

      if (sub.includes('2') || sub.includes('segunda')) {
        if (isSubPct && bestMapping.perda2GrauPctColIndex === -1) bestMapping.perda2GrauPctColIndex = c;
        else if (!isSubPct && bestMapping.perda2GrauColIndex === -1) bestMapping.perda2GrauColIndex = c;
      }
      if (sub.includes('cru')) {
        if (isSubPct && bestMapping.perdaCruaPctColIndex === -1) bestMapping.perdaCruaPctColIndex = c;
        else if (!isSubPct && bestMapping.perdaCruaColIndex === -1) bestMapping.perdaCruaColIndex = c;
      }
      if (sub.includes('trinca')) {
        if (isSubPct && bestMapping.perdaTrincaPctColIndex === -1) bestMapping.perdaTrincaPctColIndex = c;
        else if (!isSubPct && bestMapping.perdaTrincaColIndex === -1) bestMapping.perdaTrincaColIndex = c;
      }
      if (sub.includes('quebra') || sub.includes('caco')) {
        if (isSubPct && bestMapping.perdaQuebraPctColIndex === -1) bestMapping.perdaQuebraPctColIndex = c;
        else if (!isSubPct && bestMapping.perdaQuebraColIndex === -1) bestMapping.perdaQuebraColIndex = c;
      }
    }
  }

  return {
    headerRowIndex: bestRowIndex,
    headers: headerRow,
    mapping: bestMapping,
  };
}

export interface ColumnBlock {
  ovenName: string;
  mapping: ColumnMapping;
}

/**
 * Detects multiple side-by-side kiln column blocks in the same worksheet grid.
 * (e.g. Forno 1 in cols 0-5, Forno 2 in cols 6-11, Forno 3 in cols 12-17...)
 */
export function detectColumnBlocks(grid: unknown[][], headerRowIndex: number): ColumnBlock[] {
  const headerRow = grid[headerRowIndex] || [];
  const prevRow = headerRowIndex > 0 ? grid[headerRowIndex - 1] || [] : [];

  // Find all columns in headerRow that represent ENFORNA
  const enfornaCols: number[] = [];
  for (let c = 0; c < headerRow.length; c++) {
    const raw = String(headerRow[c] || '').trim();
    const clean = cleanKey(raw);
    if (isPercentageHeader(raw)) continue;
    if (clean.includes('diferen') || clean.includes('acumulad') || clean.includes('saldo') || clean.includes('data')) continue;

    if (
      clean.includes('enforna') ||
      clean.includes('carga') ||
      clean.includes('queima') ||
      clean.includes('entrada') ||
      (clean.includes('pecas') && !clean.includes('des') && !clean.includes('sai') && !clean.includes('boa'))
    ) {
      enfornaCols.push(c);
    }
  }

  // If fewer than 2 enforna columns found, there's only 1 block
  if (enfornaCols.length < 2) {
    return [];
  }

  let globalDataCol = -1;
  let globalCamaraCol = -1;
  for (let c = 0; c < Math.min(8, headerRow.length); c++) {
    const clean = cleanKey(headerRow[c]);
    if (globalDataCol === -1 && (clean === 'data' || clean === 'dia' || clean === 'date')) globalDataCol = c;
    if (globalCamaraCol === -1 && (clean.includes('camara') || clean === 'cam' || clean === 'vagoneta')) globalCamaraCol = c;
  }

  const blocks: ColumnBlock[] = [];
  for (let i = 0; i < enfornaCols.length; i++) {
    const enfCol = enfornaCols[i];
    const prevEnfCol = i > 0 ? enfornaCols[i - 1] : 0;
    const nextEnfCol = i < enfornaCols.length - 1 ? enfornaCols[i + 1] : headerRow.length;

    const blockStart = i === 0 ? 0 : Math.max(prevEnfCol + 1, enfCol - 2);
    const blockEnd = i < enfornaCols.length - 1 ? nextEnfCol - 1 : headerRow.length - 1;

    let detectedOvenName = `Forno ${i + 1}`;
    for (let c = Math.max(0, enfCol - 4); c <= Math.min(headerRow.length - 1, enfCol + 4); c++) {
      const cellAbove = String(prevRow[c] || '').trim().toLowerCase();
      const cellHere = String(headerRow[c] || '').trim().toLowerCase();
      const matchAbove = cellAbove.match(/(?:forno|kiln|fn|f)[_\-\s]*0?([1-9][0-9]?)\b/i) ||
                         cellAbove.match(/\b([1-9][0-9]?)[º°\s]*(?:forno|kiln)\b/i);
      const matchHere = cellHere.match(/(?:forno|kiln|fn|f)[_\-\s]*0?([1-9][0-9]?)\b/i) ||
                        cellHere.match(/\b([1-9][0-9]?)[º°\s]*(?:forno|kiln)\b/i);
      if (matchAbove && !cellAbove.includes('total') && !cellAbove.includes('resumo')) {
        detectedOvenName = `Forno ${parseInt(matchAbove[1], 10)}`;
        break;
      } else if (matchHere && !cellHere.includes('total') && !cellHere.includes('resumo')) {
        detectedOvenName = `Forno ${parseInt(matchHere[1], 10)}`;
        break;
      }
    }

    const blockMapping: ColumnMapping = {
      dataColIndex: globalDataCol,
      fornoColIndex: -1,
      camaraColIndex: globalCamaraCol,
      enfornaColIndex: enfCol,
      desenfornaColIndex: -1,
      diferencaColIndex: -1,
      aMenosColIndex: -1,
      aMaisColIndex: -1,
      pecasMaisMenosColIndex: -1,
      totalPerdasColIndex: -1,
      perda2GrauColIndex: -1,
      perdaCruaColIndex: -1,
      perdaTrincaColIndex: -1,
      perdaQuebraColIndex: -1,
      totalPerdasPctColIndex: -1,
      perda2GrauPctColIndex: -1,
      perdaCruaPctColIndex: -1,
      perdaTrincaPctColIndex: -1,
      perdaQuebraPctColIndex: -1,
    };

    for (let c = blockStart; c <= blockEnd; c++) {
      const rawCell = headerRow[c];
      const rawStr = String(rawCell || '').trim();
      const cellText = cleanKey(rawCell);
      const isPct = isPercentageHeader(rawStr);

      if (cellText === 'data' || cellText === 'dia') {
        blockMapping.dataColIndex = c;
      } else if (cellText.includes('camara') || cellText === 'cam') {
        blockMapping.camaraColIndex = c;
      } else if (
        !isPct &&
        !cellText.includes('perda') &&
        !cellText.includes('diferen') &&
        (cellText.includes('desenforna') || cellText.includes('desforna') || cellText.includes('saida') || cellText.includes('boa') || cellText.includes('util') || cellText.includes('1linha'))
      ) {
        if (blockMapping.desenfornaColIndex === -1) blockMapping.desenfornaColIndex = c;
      } else if (cellText.includes('2grau') || cellText.includes('segunda') || cellText === '2a') {
        if (!isPct && blockMapping.perda2GrauColIndex === -1) blockMapping.perda2GrauColIndex = c;
      } else if (cellText.includes('crua') || cellText === 'pcrua') {
        if (!isPct && blockMapping.perdaCruaColIndex === -1) blockMapping.perdaCruaColIndex = c;
      } else if (cellText.includes('trinca') || cellText === 'ptrinca') {
        if (!isPct && blockMapping.perdaTrincaColIndex === -1) blockMapping.perdaTrincaColIndex = c;
      } else if (cellText.includes('quebra') || cellText === 'pquebra' || cellText.includes('caco')) {
        if (!isPct && blockMapping.perdaQuebraColIndex === -1) blockMapping.perdaQuebraColIndex = c;
      } else if (cellText.includes('totalperda') || cellText.includes('perdatotal') || cellText.includes('perdas') || cellText.includes('perda')) {
        if (!isPct && blockMapping.totalPerdasColIndex === -1) blockMapping.totalPerdasColIndex = c;
      } else if (cellText.includes('diferenca') || cellText === 'dif') {
        if (!isPct && blockMapping.diferencaColIndex === -1) blockMapping.diferencaColIndex = c;
      }
    }

    blocks.push({
      ovenName: detectedOvenName,
      mapping: blockMapping,
    });
  }

  return blocks;
}

/**
 * Parses a single worksheet using detected header row and mappings.
 * Filters out all summary rows so perdas NEVER exceed real factory values.
 */
export function parseSheetGrid(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  forcedOvenName?: string,
  overrideYear?: number,
  overrideMonth?: string,
  forceMonthYear: boolean = false
): SheetParseResult {
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: true,
  });

  const ovenName = forcedOvenName || normalizeOvenName(sheetName);
  const isOven = isOvenSheetName(sheetName);

  if (grid.length === 0) {
    return {
      sheetName,
      isOvenSheet: isOven,
      ovenName,
      headerRowIndex: 0,
      headers: [],
      records: [],
      columnMapping: {
        dataColIndex: -1,
        fornoColIndex: -1,
        camaraColIndex: -1,
        enfornaColIndex: -1,
        desenfornaColIndex: -1,
        diferencaColIndex: -1,
        aMenosColIndex: -1,
        aMaisColIndex: -1,
        pecasMaisMenosColIndex: -1,
        totalPerdasColIndex: -1,
        perda2GrauColIndex: -1,
        perdaCruaColIndex: -1,
        perdaTrincaColIndex: -1,
        perdaQuebraColIndex: -1,
        totalPerdasPctColIndex: -1,
        perda2GrauPctColIndex: -1,
        perdaCruaPctColIndex: -1,
        perdaTrincaPctColIndex: -1,
        perdaQuebraPctColIndex: -1,
      },
      rowCount: 0,
      totalEnforna: 0,
      totalPerda: 0,
      discardedRowsCount: 0,
    };
  }

  const { headerRowIndex, headers, mapping } = detectHeaderRowAndMapping(grid);
  const columnBlocks = detectColumnBlocks(grid, headerRowIndex);

  // Fallback: If no enforna column found, detect numeric column with chamber sizes (typically >= 1000)
  if (mapping.enfornaColIndex === -1 && columnBlocks.length === 0) {
    for (let c = 0; c < (grid[headerRowIndex + 1]?.length || 0); c++) {
      let count = 0;
      for (let r = headerRowIndex + 1; r < Math.min(headerRowIndex + 15, grid.length); r++) {
        const val = parsePieceCount(grid[r]?.[c], 0);
        if (val >= 1000) count++;
      }
      if (count >= 2) {
        mapping.enfornaColIndex = c;
        break;
      }
    }
  }

  const records: ChamberRecord[] = [];
  const startRow = headerRowIndex + 1;

  // Determine context month and year
  let contextYear = overrideYear || new Date().getFullYear();
  let contextMonth = overrideMonth || String(new Date().getMonth() + 1).padStart(2, '0');

  if (!overrideMonth) {
    // 1. Try detecting month from sheetName (e.g. "Agosto", "Setembro", "10-2026")
    const cleanSheet = cleanKey(sheetName);
    for (const [name, mNum] of Object.entries(MONTH_NAMES_MAP)) {
      if (cleanSheet.includes(name)) {
        contextMonth = mNum;
        break;
      }
    }

    // 2. Scan ONLY date column (or first 2 columns) for explicit full date cells
    const dateCol = mapping.dataColIndex >= 0 ? mapping.dataColIndex : 0;
    let detectedFromDateCell = false;

    for (let r = 0; r < Math.min(30, grid.length); r++) {
      const row = grid[r] || [];
      const val = row[dateCol];

      if (val instanceof Date && !isNaN(val.getTime())) {
        contextYear = val.getUTCFullYear();
        contextMonth = String(val.getUTCMonth() + 1).padStart(2, '0');
        detectedFromDateCell = true;
        break;
      }

      if (typeof val === 'string') {
        const fullDateMatch = val.match(/(202\d)[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (fullDateMatch) {
          contextYear = parseInt(fullDateMatch[1], 10);
          contextMonth = fullDateMatch[2].padStart(2, '0');
          detectedFromDateCell = true;
          break;
        }
        const brDateMatch = val.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](202\d)/);
        if (brDateMatch) {
          contextYear = parseInt(brDateMatch[3], 10);
          contextMonth = brDateMatch[2].padStart(2, '0');
          detectedFromDateCell = true;
          break;
        }
      }

      // Check Excel date serial number ONLY in the date column
      if (typeof val === 'number' && val > 44000 && val < 55000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const jsDate = new Date(excelEpoch.getTime() + val * 86400000);
        if (!isNaN(jsDate.getTime()) && jsDate.getUTCFullYear() >= 2023 && jsDate.getUTCFullYear() <= 2030) {
          contextYear = jsDate.getUTCFullYear();
          contextMonth = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
          detectedFromDateCell = true;
          break;
        }
      }
    }
  }

  let sheetTotalEnforna = 0;
  let sheetTotalPerda = 0;
  let idCounter = 1;
  let discardedSummaryRows = 0;
  let currentOvenName = ovenName;
  let lastValidDateStr = `${contextYear}-${contextMonth}-01`;

  for (let r = startRow; r < grid.length; r++) {
    const row = grid[r];
    if (!row || row.length === 0) continue;

    // 1. Skip summary or total row by text keywords
    if (isSummaryRow(row)) {
      discardedSummaryRows++;
      continue;
    }

    // A. Multi-column blocks mode: multiple fornos side-by-side in columns
    if (columnBlocks.length > 1) {
      for (const block of columnBlocks) {
        const bMap = block.mapping;
        let enf = bMap.enfornaColIndex >= 0 ? parsePieceCount(row[bMap.enfornaColIndex], 0) : 0;
        let des = bMap.desenfornaColIndex >= 0 ? parsePieceCount(row[bMap.desenfornaColIndex], enf) : 0;
        let p2 = bMap.perda2GrauColIndex >= 0 ? parsePieceCount(row[bMap.perda2GrauColIndex], enf) : 0;
        let pcrua = bMap.perdaCruaColIndex >= 0 ? parsePieceCount(row[bMap.perdaCruaColIndex], enf) : 0;
        let ptrinca = bMap.perdaTrincaColIndex >= 0 ? parsePieceCount(row[bMap.perdaTrincaColIndex], enf) : 0;
        let pquebra = bMap.perdaQuebraColIndex >= 0 ? parsePieceCount(row[bMap.perdaQuebraColIndex], enf) : 0;
        const totLoss = bMap.totalPerdasColIndex >= 0 ? parsePieceCount(row[bMap.totalPerdasColIndex], enf) : 0;
        const dif = bMap.diferencaColIndex >= 0 ? parsePieceCount(row[bMap.diferencaColIndex], enf) : 0;

        let sumL = p2 + pcrua + ptrinca + pquebra;
        const targetL = Math.max(totLoss, dif > 0 ? dif : 0);
        if (targetL > sumL) {
          const extra = targetL - sumL;
          if (sumL === 0) {
            sumL = targetL;
            ptrinca = Math.round(sumL * 0.396);
            p2 = Math.round(sumL * 0.283);
            pcrua = Math.round(sumL * 0.246);
            pquebra = Math.max(0, sumL - (ptrinca + p2 + pcrua));
          } else {
            const addTrinca = Math.round(extra * 0.40);
            const add2a = Math.round(extra * 0.30);
            ptrinca += addTrinca;
            p2 += add2a;
            pquebra += Math.max(0, extra - addTrinca - add2a);
            sumL = targetL;
          }
        } else if (sumL === 0 && enf > des && des > 0) {
          sumL = enf - des;
          ptrinca = Math.round(sumL * 0.396);
          p2 = Math.round(sumL * 0.283);
          pcrua = Math.round(sumL * 0.246);
          pquebra = Math.max(0, sumL - (ptrinca + p2 + pcrua));
        }

        if (des === 0 && enf > 0) {
          des = Math.max(0, enf - sumL);
        }

        if (enf <= 0 && des <= 0 && sumL <= 0) continue;
        if (enf > 150000 || des > 150000) continue;

        let bDateStr = lastValidDateStr;
        const bDateRaw = bMap.dataColIndex >= 0 ? row[bMap.dataColIndex] : undefined;
        if (bDateRaw !== undefined && bDateRaw !== null && String(bDateRaw).trim() !== '') {
          bDateStr = parseExcelDate(bDateRaw, contextYear, contextMonth, forceMonthYear || Boolean(overrideMonth));
          lastValidDateStr = bDateStr;
        }

        let bCamaraVal: number | string = r - startRow + 1;
        if (bMap.camaraColIndex >= 0 && row[bMap.camaraColIndex] !== undefined && row[bMap.camaraColIndex] !== '') {
          const parsed = parseInt(String(row[bMap.camaraColIndex]), 10);
          bCamaraVal = !isNaN(parsed) ? parsed : String(row[bMap.camaraColIndex]);
        }

        const monthKey = bDateStr.slice(0, 7);
        records.push({
          id: `rec-${cleanKey(sheetName)}-${cleanKey(block.ovenName)}-${monthKey}-${r}-${idCounter++}`,
          data: bDateStr,
          forno: block.ovenName,
          camara: bCamaraVal,
          enforna: enf,
          desenforna: des,
          perda_2grau: p2,
          perda_crua: pcrua,
          perda_trinca: ptrinca,
          perda_quebra: pquebra,
          diferenca: 0,
        });

        sheetTotalEnforna += enf;
        sheetTotalPerda += sumL;
      }
      continue;
    }

    // B. Single table mode / stacked tables mode
    // Skip repeated column header row in stacked tables
    const rowClean = row.map((cell) => cleanKey(cell));
    const isRepeatedHeader =
      rowClean.some((w) => w.includes('enforna') || w.includes('carga') || w.includes('queima')) &&
      rowClean.some((w) => w.includes('desenforna') || w.includes('saida') || w.includes('camara') || w.includes('data'));
    if (isRepeatedHeader) {
      continue;
    }

    // Detect if this row is a section title for another kiln within the same sheet
    for (let c = 0; c < Math.min(10, row.length); c++) {
      const cellText = String(row[c] || '').trim();
      if (!cellText) continue;
      const lower = cellText.toLowerCase();
      const kilnMatch = lower.match(/(?:forno|kiln|fn|f)[_\-\s]*0?([1-9][0-9]?)\b/i) ||
                        lower.match(/\b([1-9][0-9]?)[º°\s]*(?:forno|kiln)\b/i);
      if (kilnMatch && !lower.includes('total') && !lower.includes('resumo') && !lower.includes('soma')) {
        currentOvenName = `Forno ${parseInt(kilnMatch[1], 10)}`;
        break;
      }
    }

    // Extract Enforna (pieces)
    let enforna = mapping.enfornaColIndex >= 0 ? parsePieceCount(row[mapping.enfornaColIndex], 0) : 0;

    // Extract Desenforna
    let desenforna = mapping.desenfornaColIndex >= 0 ? parsePieceCount(row[mapping.desenfornaColIndex], enforna) : 0;

    // Extract Defect pieces using enforna reference if a percentage was given
    let perda_2grau = 0;
    if (mapping.perda2GrauColIndex >= 0) {
      perda_2grau = parsePieceCount(row[mapping.perda2GrauColIndex], enforna);
    } else if (mapping.perda2GrauPctColIndex >= 0) {
      perda_2grau = parsePieceCount(row[mapping.perda2GrauPctColIndex], enforna);
    }

    let perda_crua = 0;
    if (mapping.perdaCruaColIndex >= 0) {
      perda_crua = parsePieceCount(row[mapping.perdaCruaColIndex], enforna);
    } else if (mapping.perdaCruaPctColIndex >= 0) {
      perda_crua = parsePieceCount(row[mapping.perdaCruaPctColIndex], enforna);
    }

    let perda_trinca = 0;
    if (mapping.perdaTrincaColIndex >= 0) {
      perda_trinca = parsePieceCount(row[mapping.perdaTrincaColIndex], enforna);
    } else if (mapping.perdaTrincaPctColIndex >= 0) {
      perda_trinca = parsePieceCount(row[mapping.perdaTrincaPctColIndex], enforna);
    }

    let perda_quebra = 0;
    if (mapping.perdaQuebraColIndex >= 0) {
      perda_quebra = parsePieceCount(row[mapping.perdaQuebraColIndex], enforna);
    } else if (mapping.perdaQuebraPctColIndex >= 0) {
      perda_quebra = parsePieceCount(row[mapping.perdaQuebraPctColIndex], enforna);
    }

    let sumPerdas = perda_2grau + perda_crua + perda_trinca + perda_quebra;

    // Check if a Total Perdas column was present in the sheet
    const totalPerdasColVal = mapping.totalPerdasColIndex >= 0 ? parsePieceCount(row[mapping.totalPerdasColIndex], enforna) : 0;

    // Check if a Diferença column was present in the sheet (e.g. DIFERENCA-TC9.xlsx)
    const diferencaColVal = mapping.diferencaColIndex >= 0 ? parsePieceCount(row[mapping.diferencaColIndex], enforna) : 0;

    const hasAnyLoss = sumPerdas > 0 || totalPerdasColVal > 0 || diferencaColVal > 0;

    // RULE 2: Discard any ghost row with enforna=0 AND desenforna=0 but some loss>0 — never a real chamber (inflated monthly total row!)
    if (enforna <= 0 && desenforna <= 0 && hasAnyLoss) {
      discardedSummaryRows++;
      continue;
    }

    // RULE 3: Safeguard against totals/summary rows: Real kiln chambers can hold up to 100k-120k pieces in large ceramic plants.
    // Discard only formula rows with > 150.000 pieces (unlabelled summary totals)
    if (enforna > 150000 || desenforna > 150000) {
      discardedSummaryRows++;
      continue;
    }

    // RULE 4: Discard row only if both Date AND Camara are empty AND enforna is abnormally high (summary rows)
    const rawDateCell = mapping.dataColIndex >= 0 ? row[mapping.dataColIndex] : undefined;
    const rawCamaraCell = mapping.camaraColIndex >= 0 ? row[mapping.camaraColIndex] : undefined;
    const isDateEmpty = rawDateCell === undefined || rawDateCell === null || String(rawDateCell).trim() === '';
    const isCamaraEmpty = rawCamaraCell === undefined || rawCamaraCell === null || String(rawCamaraCell).trim() === '';
    
    // If the sheet has an explicit camara column and both date and camara are blank, and volume exceeds 80k, it is a subtotal row
    if (mapping.camaraColIndex >= 0 && isDateEmpty && isCamaraEmpty && (enforna > 80000 || desenforna > 80000)) {
      discardedSummaryRows++;
      continue;
    }

    // If enforna is 0 but desenforna is > 0, estimate enforna
    if (enforna <= 0 && desenforna > 0) {
      enforna = desenforna + Math.max(sumPerdas, totalPerdasColVal, diferencaColVal);
    }

    // Skip empty rows with no production
    if (enforna <= 0 && desenforna <= 0 && !hasAnyLoss) {
      continue;
    }

    // Loss reconciliation: Ensure totalPerdas captures the true full loss from the sheet
    const targetTotalLoss = Math.max(totalPerdasColVal, diferencaColVal > 0 ? diferencaColVal : 0);
    if (targetTotalLoss > sumPerdas) {
      const extraLoss = targetTotalLoss - sumPerdas;
      if (sumPerdas === 0) {
        sumPerdas = targetTotalLoss;
        // Realistic breakdown based on factory benchmarks
        perda_trinca = Math.round(sumPerdas * 0.396);
        perda_2grau = Math.round(sumPerdas * 0.283);
        perda_crua = Math.round(sumPerdas * 0.246);
        perda_quebra = Math.max(0, sumPerdas - (perda_trinca + perda_2grau + perda_crua));
      } else {
        // Add remaining deficit to defect breakdown
        const addTrinca = Math.round(extraLoss * 0.40);
        const add2a = Math.round(extraLoss * 0.30);
        perda_trinca += addTrinca;
        perda_2grau += add2a;
        perda_quebra += Math.max(0, extraLoss - addTrinca - add2a);
        sumPerdas = targetTotalLoss;
      }
    } else if (sumPerdas === 0 && enforna > desenforna && desenforna > 0) {
      sumPerdas = enforna - desenforna;
      perda_trinca = Math.round(sumPerdas * 0.396);
      perda_2grau = Math.round(sumPerdas * 0.283);
      perda_crua = Math.round(sumPerdas * 0.246);
      perda_quebra = Math.max(0, sumPerdas - (perda_trinca + perda_2grau + perda_crua));
    }

    // If desenforna was 0 or not mapped, calculate it: Desenforna = Enforna - Perdas
    if (desenforna === 0 && enforna > 0) {
      const effectiveLoss = Math.max(sumPerdas, targetTotalLoss);
      desenforna = Math.max(0, enforna - effectiveLoss);
    }

    // Extract Date with carry-forward support for merged cells and same-day firings
    let dateStr = lastValidDateStr;
    if (!isDateEmpty) {
      dateStr = parseExcelDate(rawDateCell, contextYear, contextMonth, forceMonthYear || Boolean(overrideMonth));
      lastValidDateStr = dateStr;
    }

    // Extract Oven
    let fornoStr = mapping.fornoColIndex >= 0 ? String(row[mapping.fornoColIndex] || '') : '';
    if (!fornoStr.trim()) {
      fornoStr = currentOvenName || ovenName;
    } else {
      fornoStr = normalizeOvenName(fornoStr);
    }

    // Extract Chamber
    let camaraVal: number | string = r - startRow + 1;
    if (mapping.camaraColIndex >= 0 && row[mapping.camaraColIndex] !== undefined && row[mapping.camaraColIndex] !== '') {
      const parsed = parseInt(String(row[mapping.camaraColIndex]), 10);
      camaraVal = !isNaN(parsed) ? parsed : String(row[mapping.camaraColIndex]);
    }

    // Ajuste de Estoque / Reconciliação (A MENOS, A MAIS, ou Peça +/-)
    // NÃO é perda de produção nem afeta sumPerdas / defeitos da queima!
    let ajusteEstoque: number | undefined = undefined;

    const hasAMenos = mapping.aMenosColIndex >= 0;
    const hasAMais = mapping.aMaisColIndex >= 0;
    const hasPecasMaisMenos = mapping.pecasMaisMenosColIndex >= 0;

    if (hasAMenos || hasAMais) {
      const aMenosVal = hasAMenos ? Math.abs(parsePieceCount(row[mapping.aMenosColIndex], enforna, true)) : 0;
      const aMaisVal = hasAMais ? Math.abs(parsePieceCount(row[mapping.aMaisColIndex], enforna, true)) : 0;
      if (aMaisVal > 0 || aMenosVal > 0) {
        ajusteEstoque = aMaisVal - aMenosVal;
      }
    } else if (hasPecasMaisMenos) {
      const rawVal = row[mapping.pecasMaisMenosColIndex];
      if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
        ajusteEstoque = parsePieceCount(rawVal, enforna, true);
      }
    }

    // Unique record ID including month key, sheet, and row index
    const monthKey = dateStr.slice(0, 7);
    records.push({
      id: `rec-${cleanKey(sheetName)}-${monthKey}-${r}-${idCounter++}`,
      data: dateStr,
      forno: fornoStr,
      camara: camaraVal,
      enforna,
      desenforna,
      perda_2grau,
      perda_crua,
      perda_trinca,
      perda_quebra,
      diferenca: ajusteEstoque,
    });

    sheetTotalEnforna += enforna;
    sheetTotalPerda += sumPerdas;
  }

  return {
    sheetName,
    isOvenSheet: isOven,
    ovenName,
    headerRowIndex,
    headers,
    records,
    columnMapping: mapping,
    rowCount: records.length,
    totalEnforna: sheetTotalEnforna,
    totalPerda: sheetTotalPerda,
    discardedRowsCount: discardedSummaryRows,
  };
}

/**
 * Reads any Excel (.xlsx, .xls, .xlsm, .csv) file,
 * accurately separates piece counts and % values, supports multi-sheet kilns or weeks,
 * and converts directly into ChamberRecord objects.
 */
export async function readXlsxToChamberRecords(
  file: File,
  forcedSheetName?: string,
  overrideMonthKey?: string
): Promise<XlsxParseResult> {
  const warnings: string[] = [];
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellNF: true,
    cellText: true,
    raw: true,
  });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('O arquivo não contém nenhuma planilha legível.');
  }

  // Parse override month and year if provided
  let overrideYear: number | undefined;
  let overrideMonth: string | undefined;
  let forceMonthYear = false;

  if (overrideMonthKey && overrideMonthKey.includes('-')) {
    const parts = overrideMonthKey.split('-');
    overrideYear = parseInt(parts[0], 10);
    overrideMonth = parts[1];
    forceMonthYear = true;
  } else {
    // 1. Check filename for month name: e.g. "AGOSTO", "SETEMBRO", "08-2026"
    const cleanFileName = cleanKey(file.name);
    for (const [name, mNum] of Object.entries(MONTH_NAMES_MAP)) {
      if (cleanFileName.includes(name)) {
        overrideMonth = mNum;
        forceMonthYear = true;
        break;
      }
    }
    const yearMatch = file.name.match(/202\d/);
    if (yearMatch) {
      overrideYear = parseInt(yearMatch[0], 10);
    }

    // 2. Pre-scan sheet names if filename didn't specify a month
    if (!overrideMonth) {
      for (const name of sheetNames) {
        const cleanSheet = cleanKey(name);
        for (const [mName, mNum] of Object.entries(MONTH_NAMES_MAP)) {
          if (cleanSheet.includes(mName)) {
            overrideMonth = mNum;
            forceMonthYear = true;
            break;
          }
        }
        if (overrideMonth) break;
      }
    }

    // 3. Pre-scan date cells across first sheets if still undefined
    if (!overrideMonth) {
      for (const name of sheetNames.slice(0, 3)) {
        const sheet = workbook.Sheets[name];
        if (!sheet) continue;
        const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true });
        for (let r = 0; r < Math.min(25, grid.length); r++) {
          const row = grid[r] || [];
          for (let c = 0; c < Math.min(5, row.length); c++) {
            const val = row[c];
            if (val instanceof Date && !isNaN(val.getTime())) {
              overrideYear = overrideYear || val.getUTCFullYear();
              overrideMonth = String(val.getUTCMonth() + 1).padStart(2, '0');
              break;
            }
            if (typeof val === 'string') {
              const m = val.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](202\d)/);
              if (m) {
                overrideYear = overrideYear || parseInt(m[3], 10);
                overrideMonth = m[2].padStart(2, '0');
                break;
              }
            }
          }
          if (overrideMonth) break;
        }
        if (overrideMonth) break;
      }
    }
  }

  // Parse all sheets with workbook-wide detected month and forceMonthYear
  const sheetResults: SheetParseResult[] = [];
  for (const name of sheetNames) {
    const sheet = workbook.Sheets[name];
    if (sheet) {
      const parsed = parseSheetGrid(sheet, name, undefined, overrideYear, overrideMonth, forceMonthYear);
      sheetResults.push(parsed);
    }
  }

  // Filter individual oven sheets
  const ovenSheets = sheetResults.filter(
    (s) => isOvenSheetName(s.sheetName) && s.records.length > 0
  );

  // Sheets that have data and are NOT pure summary / result tabs
  const dataSheets = sheetResults.filter(
    (s) =>
      !cleanKey(s.sheetName).includes('resultado') &&
      !cleanKey(s.sheetName).includes('resumo') &&
      !cleanKey(s.sheetName).includes('total') &&
      s.records.length > 0
  );

  let targetSheetName = forcedSheetName;
  let finalRecords: ChamberRecord[] = [];

  if (targetSheetName) {
    if (targetSheetName === '__ALL_OVENS__' || targetSheetName === '__ALL_SHEETS__') {
      if (ovenSheets.length > 0) {
        finalRecords = ovenSheets.flatMap((s) => s.records);
      } else if (dataSheets.length > 0) {
        finalRecords = dataSheets.flatMap((s) => s.records);
      } else {
        finalRecords = sheetResults.flatMap((s) => s.records);
      }
    } else {
      const found = sheetResults.find((s) => s.sheetName === targetSheetName);
      if (found) finalRecords = found.records;
    }
  } else {
    // Check if there is a single consolidated sheet with higher production than all individual oven sheets combined
    const totalEnfornaOvenSheets = ovenSheets.reduce((sum, s) => sum + (s.totalEnforna || 0), 0);
    const totalRecordsOvenSheets = ovenSheets.reduce((sum, s) => sum + (s.records.length || 0), 0);
    const totalEnfornaDataSheets = dataSheets.reduce((sum, s) => sum + (s.totalEnforna || 0), 0);
    const totalRecordsDataSheets = dataSheets.reduce((sum, s) => sum + (s.records.length || 0), 0);

    const sortedByEnforna = [...sheetResults].sort((a, b) => (b.totalEnforna || 0) - (a.totalEnforna || 0));
    const bestSingleSheet = sortedByEnforna[0];

    // Priority 0: If a single consolidated sheet has MORE enforna or more chambers than all other sheets combined, prefer it!
    if (
      bestSingleSheet &&
      bestSingleSheet.totalEnforna > totalEnfornaOvenSheets &&
      bestSingleSheet.totalEnforna > totalEnfornaDataSheets &&
      bestSingleSheet.records.length >= Math.max(totalRecordsOvenSheets, totalRecordsDataSheets)
    ) {
      targetSheetName = bestSingleSheet.sheetName;
      finalRecords = bestSingleSheet.records;
    } else if (ovenSheets.length > 0 && (totalEnfornaOvenSheets >= totalEnfornaDataSheets || dataSheets.length <= 1)) {
      // Priority 1: If individual oven sheets exist and have higher or equal volume, combine all oven sheets!
      targetSheetName = '__ALL_OVENS__';
      finalRecords = ovenSheets.flatMap((s) => s.records);
    } else if (dataSheets.length > 1 && totalEnfornaDataSheets > totalEnfornaOvenSheets) {
      // Priority 2: If multiple data sheets (e.g. weeks or batch tabs) exist and have higher volume, combine them!
      targetSheetName = '__ALL_SHEETS__';
      finalRecords = dataSheets.flatMap((s) => s.records);
    } else if (ovenSheets.length > 0) {
      targetSheetName = '__ALL_OVENS__';
      finalRecords = ovenSheets.flatMap((s) => s.records);
    } else if (dataSheets.length === 1) {
      targetSheetName = dataSheets[0].sheetName;
      finalRecords = dataSheets[0].records;
    } else {
      // Fallback: check sheet with most production or records
      if (bestSingleSheet && bestSingleSheet.records.length > 0) {
        targetSheetName = bestSingleSheet.sheetName;
        finalRecords = bestSingleSheet.records;
      } else {
        targetSheetName = sheetNames[0];
        finalRecords = [];
      }
    }
  }

  if (finalRecords.length === 0) {
    const sheetsList = sheetNames.join(', ');
    throw new Error(
      `Nenhum dado numérico válido de enforna foi identificado nas abas: [${sheetsList}]. ` +
      `Verifique se as colunas ENFORNA ou DESENFORNA estão preenchidas.`
    );
  }

  // Calculate automatic metrics over parsed records
  let metrics = computeSummaryMetrics(finalRecords, 'all');

  // Compute breakdown by oven for user inspection
  const ovenMap = new Map<string, { camaras: number; enforna: number; desenforna: number; perda: number }>();
  for (const r of finalRecords) {
    let cur = ovenMap.get(r.forno);
    if (!cur) {
      cur = { camaras: 0, enforna: 0, desenforna: 0, perda: 0 };
      ovenMap.set(r.forno, cur);
    }
    cur.camaras += 1;
    cur.enforna += r.enforna;
    cur.desenforna += r.desenforna;
    cur.perda += (r.perda_2grau + r.perda_crua + r.perda_trinca + r.perda_quebra);
  }

  const ovenBreakdown = Array.from(ovenMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([forno, val]) => ({
      forno,
      camaras: val.camaras,
      enforna: val.enforna,
      desenforna: val.desenforna,
      perda: val.perda,
      perdaPct: val.enforna > 0 ? (val.perda / val.enforna) * 100 : 0,
    }));

  const allDates = finalRecords.map((r) => r.data).sort();
  const minDate = allDates[0] || '2026-09-01';
  const maxDate = allDates[allDates.length - 1] || '2026-09-30';

  // Calculate total discarded summary/ghost rows
  let totalDiscardedRows = 0;
  if (targetSheetName === '__ALL_OVENS__') {
    totalDiscardedRows = ovenSheets.reduce((sum, s) => sum + (s.discardedRowsCount || 0), 0);
  } else if (targetSheetName === '__ALL_SHEETS__') {
    totalDiscardedRows = dataSheets.reduce((sum, s) => sum + (s.discardedRowsCount || 0), 0);
  } else {
    const found = sheetResults.find((s) => s.sheetName === targetSheetName);
    totalDiscardedRows = found ? (found.discardedRowsCount || 0) : sheetResults.reduce((sum, s) => sum + (s.discardedRowsCount || 0), 0);
  }

  // Detected month key: Priority: 1. If explicit override provided, use it. 2. Predominant month key from records!
  const monthCounts = new Map<string, number>();
  for (const r of finalRecords) {
    if (r.data && r.data.length >= 7) {
      const mk = r.data.slice(0, 7);
      monthCounts.set(mk, (monthCounts.get(mk) || 0) + 1);
    }
  }
  let predominantMonthKey: string | undefined;
  let maxCount = 0;
  for (const [mk, count] of monthCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      predominantMonthKey = mk;
    }
  }

  const detectedMonthKey = (overrideMonthKey && overrideMonthKey !== 'auto')
    ? overrideMonthKey
    : (predominantMonthKey || (allDates[0] ? allDates[0].slice(0, 7) : undefined));

  // Normalize finalRecords so all chambers stay strictly in this month
  if (detectedMonthKey && detectedMonthKey.includes('-')) {
    const [dYear, dMonth] = detectedMonthKey.split('-');
    for (const r of finalRecords) {
      if (!r.data || !r.data.startsWith(detectedMonthKey)) {
        const parts = (r.data || '').split('-');
        const day = parts[2] ? parts[2].padStart(2, '0') : (parts[0] && parts[0].length <= 2 ? parts[0].padStart(2, '0') : '01');
        r.data = `${dYear}-${dMonth}-${day}`;
      }
    }
  }

  // Recalculate metrics over fully normalized records
  metrics = computeSummaryMetrics(finalRecords, 'all');

  return {
    records: finalRecords,
    metrics,
    fileName: file.name,
    sheetNames,
    activeSheetName:
      targetSheetName === '__ALL_OVENS__'
        ? 'Todas as Abas de Fornos Combinadas'
        : targetSheetName === '__ALL_SHEETS__'
        ? 'Todas as Abas de Dados Combinadas'
        : (targetSheetName || sheetNames[0]),
    rawTargetSheetName: targetSheetName || sheetNames[0],
    totalRowsProcessed: finalRecords.length,
    discardedRowsCount: totalDiscardedRows,
    sheetResults,
    ovenBreakdown,
    warnings,
    minDate,
    maxDate,
    detectedMonthKey,
  };
}

// Download sample Excel template (.xlsx)
export function downloadSampleTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Tab: FORNO 01
  const sampleForno1 = [
    { DATA: '2026-09-01', CAMARA: 20, ENFORNA: 15600, DESENFORNA: 15000, '2ª': 180, CRUA: 120, TRINCA: 240, QUEBRA: 60 },
    { DATA: '2026-09-02', CAMARA: 21, ENFORNA: 15800, DESENFORNA: 15190, '2ª': 190, CRUA: 110, TRINCA: 250, QUEBRA: 60 },
  ];
  const wsForno1 = XLSX.utils.json_to_sheet(sampleForno1);
  XLSX.utils.book_append_sheet(wb, wsForno1, 'FORNO 01');

  // Tab: FORNO 02
  const sampleForno2 = [
    { DATA: '2026-09-01', CAMARA: 1, ENFORNA: 12000, DESENFORNA: 11150, '2ª': 220, CRUA: 150, TRINCA: 380, QUEBRA: 100 },
  ];
  const wsForno2 = XLSX.utils.json_to_sheet(sampleForno2);
  XLSX.utils.book_append_sheet(wb, wsForno2, 'FORNO 02');

  // Tab: RESULTADO
  const sampleResultado = [
    { DATA: '2026-09-01', FORNO: 'Forno 1', CAMARA: 20, ENFORNA: 15600, DESENFORNA: 15000, '2ª': 180, CRUA: 120, TRINCA: 240, QUEBRA: 60 },
    { DATA: '2026-09-01', FORNO: 'Forno 2', CAMARA: 1, ENFORNA: 12000, DESENFORNA: 11150, '2ª': 220, CRUA: 150, TRINCA: 380, QUEBRA: 100 },
  ];
  const wsResultado = XLSX.utils.json_to_sheet(sampleResultado);
  XLSX.utils.book_append_sheet(wb, wsResultado, 'RESULTADO');

  XLSX.writeFile(wb, 'modelo_controle_fornos_DIFERENCA_TC9.xlsx');
}

// Export HTML report
export function exportHtmlReport(
  title: string,
  records: ChamberRecord[],
  totalEnforna: number,
  totalDesenforna: number,
  totalPerdas: number,
  eficienciaPct: number
): void {
  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
    h1 { font-size: 20px; margin-bottom: 8px; color: #0f172a; }
    .kpis { display: flex; gap: 16px; margin: 20px 0; }
    .kpi { padding: 12px 16px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .kpi-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    .kpi-val { font-size: 20px; font-weight: bold; margin-top: 4px; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: right; }
    th { background: #f1f5f9; text-align: right; font-weight: 600; }
    th:first-child, td:first-child { text-align: left; }
    tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="kpis">
    <div class="kpi">
      <div class="kpi-title">Enforna Total</div>
      <div class="kpi-val" style="color:#0284c7">${formatNumberBR(totalEnforna)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-title">Desenforna Total</div>
      <div class="kpi-val" style="color:#ea580c">${formatNumberBR(totalDesenforna)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-title">Perdas Totais</div>
      <div class="kpi-val" style="color:#dc2626">${formatNumberBR(totalPerdas)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-title">Eficiência</div>
      <div class="kpi-val" style="color:#16a34a">${formatPercentBR(eficienciaPct)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left">Data</th>
        <th>Forno</th>
        <th>Câmara</th>
        <th>Enforna</th>
        <th>Desenforna</th>
        <th>2ª Linha</th>
        <th>Crua</th>
        <th>Trinca</th>
        <th>Quebra</th>
        <th>Total Perda</th>
      </tr>
    </thead>
    <tbody>
      ${records
        .map((r) => {
          const perda = r.perda_2grau + r.perda_crua + r.perda_trinca + r.perda_quebra;
          return `<tr>
          <td style="text-align:left">${formatDateBR(r.data)}</td>
          <td>${r.forno}</td>
          <td>${r.camara}</td>
          <td>${formatNumberBR(r.enforna)}</td>
          <td>${formatNumberBR(r.desenforna)}</td>
          <td>${formatNumberBR(r.perda_2grau)}</td>
          <td>${formatNumberBR(r.perda_crua)}</td>
          <td>${formatNumberBR(r.perda_trinca)}</td>
          <td>${formatNumberBR(r.perda_quebra)}</td>
          <td style="font-weight:bold;color:#dc2626">${formatNumberBR(perda)}</td>
        </tr>`;
        })
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${cleanKey(title)}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
