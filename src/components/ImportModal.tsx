import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Layers,
  Flame,
  Calendar,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { ChamberRecord } from '../types';
import {
  readXlsxToChamberRecords,
  XlsxParseResult,
  downloadSampleTemplate,
} from '../utils/fileParser';
import {
  formatNumberBR,
  formatPercentBR,
  formatDateBR,
  getAvailableMonths,
  formatMonthYearBR,
} from '../utils/calculations';

export type ImportModeType = 'keep-months' | 'replace' | 'append';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (
    newRecords: ChamberRecord[],
    mode: ImportModeType,
    sourceName: string,
    discardedRowsCount?: number
  ) => void;
  existingRecords?: ChamberRecord[];
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  existingRecords = [],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<XlsxParseResult | null>(null);
  const [importMode, setImportMode] = useState<ImportModeType>('keep-months');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const existingMonths = getAvailableMonths(existingRecords);
  const fileMonths = result ? getAvailableMonths(result.records) : [];

  // Generate selectable months (current year, previous year, next year)
  const monthSelectorOptions = [
    { key: '2026-12', label: 'Dezembro / 2026' },
    { key: '2026-11', label: 'Novembro / 2026' },
    { key: '2026-10', label: 'Outubro / 2026' },
    { key: '2026-09', label: 'Setembro / 2026' },
    { key: '2026-08', label: 'Agosto / 2026' },
    { key: '2026-07', label: 'Julho / 2026' },
    { key: '2026-06', label: 'Junho / 2026' },
    { key: '2026-05', label: 'Maio / 2026' },
    { key: '2026-04', label: 'Abril / 2026' },
    { key: '2026-03', label: 'Março / 2026' },
    { key: '2026-02', label: 'Fevereiro / 2026' },
    { key: '2026-01', label: 'Janeiro / 2026' },
    { key: '2025-12', label: 'Dezembro / 2025' },
    { key: '2025-11', label: 'Novembro / 2025' },
    { key: '2025-10', label: 'Outubro / 2025' },
    { key: '2025-09', label: 'Setembro / 2025' },
    { key: '2025-08', label: 'Agosto / 2025' },
    { key: '2025-07', label: 'Julho / 2025' },
  ];

  const processFile = async (file: File, sheetName?: string, overrideMonth?: string) => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Auto-detect month unless an explicit override was provided by user
      const monthToUse = overrideMonth && overrideMonth !== 'auto' ? overrideMonth : undefined;
      const parsedResult = await readXlsxToChamberRecords(file, sheetName, monthToUse);
      setResult(parsedResult);
      setCurrentFile(file);

      if (parsedResult.detectedMonthKey) {
        setSelectedMonthKey(parsedResult.detectedMonthKey);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Erro ao ler o arquivo Excel. Verifique se o arquivo contém dados de queima.'
      );
      setResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleMonthChange = (newMonthKey: string) => {
    setSelectedMonthKey(newMonthKey);
    if (currentFile) {
      processFile(currentFile, result?.rawTargetSheetName, newMonthKey);
    }
  };

  const handleApplyToDashboard = () => {
    if (!result || result.records.length === 0) return;
    onImportSuccess(result.records, importMode, result.fileName, result.discardedRowsCount || 0);
    onClose();
  };

  const handleSwitchSheet = (newSheet: string) => {
    if (currentFile) {
      processFile(currentFile, newSheet, selectedMonthKey);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl p-5 sm:p-6 rounded-2xl bg-[#1c1b19] border border-[#393733] shadow-2xl text-[#f4efe6] max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2e2d2a] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#f4efe6]">
                Adicionar Planilha à Base
              </h3>
              <p className="text-xs text-[#9e988f]">
                Carregamento completo de enforna, desenforna, perdas e histórico mensal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8c867e] hover:text-[#f4efe6] hover:bg-[#282724] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1">
          {/* Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#c85a2b] bg-[#c85a2b]/10'
                : 'border-[#383632] hover:border-[#4d4a45] bg-[#21201d]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.xlsb,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain,*/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <Upload className="w-9 h-9 mx-auto text-[#8c867e] mb-2.5" />
            <p className="text-sm font-semibold text-[#f4efe6]">
              {isProcessing
                ? 'Lendo planilha e calculando métricas...'
                : 'Clique para selecionar ou arraste sua planilha (.xlsx ou .csv)'}
            </p>
            <p className="text-xs text-[#8c867e] mt-1 max-w-md mx-auto">
              Lê abas de fornos, semanas ou resumo geral. Identifica enforna, desenforna, perdas e diferença com precisão.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/30 text-xs text-[#f87171] space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold mb-1">Aviso ao ler planilha:</div>
                  <div>{errorMsg}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-[#ef4444]/20 flex items-center justify-between text-[11px] text-[#f4efe6]">
                <span>Dica: Verifique se sua planilha contém colunas como ENFORNA e DESENFORNA/DIFERENÇA.</span>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="font-bold underline text-[#38bdf8] hover:text-white"
                >
                  Baixar modelo .xlsx
                </button>
              </div>
            </div>
          )}

          {/* Automatic Results & Calculation Preview */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* File details banner */}
              <div className="p-3.5 rounded-xl bg-[#242320] border border-[#33312e] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0" />
                  <div>
                    <span className="font-semibold text-[#f4efe6]">{result.fileName}</span>
                    <span className="text-[#8c867e] ml-2">
                      ({result.totalRowsProcessed} câmaras · {formatDateBR(result.minDate)} a {formatDateBR(result.maxDate)})
                    </span>
                  </div>
                </div>

                {/* Multiple sheet selector */}
                {result.sheetNames.length > 1 && (
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <Layers className="w-3.5 h-3.5 text-[#8c867e]" />
                    <select
                      value={result.activeSheetName}
                      onChange={(e) => handleSwitchSheet(e.target.value)}
                      className="bg-[#1c1b19] border border-[#393733] text-[#f4efe6] text-[11px] rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="__ALL_OVENS__">Todas as Abas Combinadas (Completo)</option>
                      {result.sheetNames.map((s) => {
                        const sr = result.sheetResults.find((r) => r.sheetName === s);
                        const countText = sr ? ` (${sr.rowCount} câmaras)` : '';
                        return (
                          <option key={s} value={s}>
                            Aba: {s}{countText}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {/* Informative banner if summary/total rows were discarded */}
              {result.discardedRowsCount > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/30 text-xs text-[#4ade80]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ade80]" />
                  <span>
                    <strong>{result.discardedRowsCount} linha{result.discardedRowsCount > 1 ? 's' : ''} de total/resumo</strong> descartada{result.discardedRowsCount > 1 ? 's' : ''} automaticamente da leitura (evitando câmaras fantasmas nos KPIs).
                  </span>
                </div>
              )}

              {/* MONTH SELECTION CONTROL - Explicit isolation to prevent accidental merging */}
              <div className="p-3.5 rounded-xl bg-[#1c1b19] border border-[#ea580c]/30 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold text-[#f4efe6] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#ea580c]" />
                    <span>Mês de Referência desta Planilha:</span>
                  </div>
                  <select
                    value={selectedMonthKey}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="bg-[#242320] border border-[#3d3a36] text-[#f4efe6] text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                  >
                    {monthSelectorOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-[11px] text-[#b0aba2] leading-relaxed">
                  {existingMonths.length > 0 ? (
                    <span>
                      Meses já na base:{' '}
                      <strong className="text-[#38bdf8]">
                        {existingMonths.map((m) => m.label).join(', ')}
                      </strong>
                      . Esta planilha será adicionada separadamente sob{' '}
                      <strong className="text-[#ea580c]">
                        {formatMonthYearBR(selectedMonthKey)}
                      </strong>{' '}
                      para permitir comparação lado a lado.
                    </span>
                  ) : (
                    <span>
                      Os registros serão gravados sob o mês de{' '}
                      <strong className="text-[#ea580c]">
                        {formatMonthYearBR(selectedMonthKey)}
                      </strong>
                      .
                    </span>
                  )}
                </div>
              </div>

              {/* OVERVIEW OF ENFORNA, DESENFORNA, PERDAS & DIFERENÇA */}
              <div className="p-3.5 rounded-xl bg-[#242320] border border-[#2e2d2a]">
                <div className="text-xs font-bold text-[#f4efe6] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Totais Lidos da Planilha:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Enforna */}
                  <div className="p-2.5 rounded-xl bg-[#1c1b19] border-t-2 border-t-[#38bdf8] border border-[#2e2d2a]">
                    <div className="text-[10px] text-[#8c867e] uppercase font-bold">Total Enforna</div>
                    <div className="text-base font-bold font-mono text-[#38bdf8] mt-0.5">
                      {formatNumberBR(result.metrics.totalEnforna)}
                    </div>
                    <div className="text-[10px] text-[#8c867e]">
                      {result.metrics.camarasCount} câmaras
                    </div>
                  </div>

                  {/* Desenforna */}
                  <div className="p-2.5 rounded-xl bg-[#1c1b19] border-t-2 border-t-[#fb923c] border border-[#2e2d2a]">
                    <div className="text-[10px] text-[#8c867e] uppercase font-bold">Total Desenforna</div>
                    <div className="text-base font-bold font-mono text-[#fb923c] mt-0.5">
                      {formatNumberBR(result.metrics.totalDesenforna)}
                    </div>
                    <div className="text-[10px] text-[#fb923c]">
                      {formatPercentBR(result.metrics.eficienciaPct)} da enforna
                    </div>
                  </div>

                  {/* Perdas Totais */}
                  <div className="p-2.5 rounded-xl bg-[#1c1b19] border-t-2 border-t-[#f87171] border border-[#2e2d2a]">
                    <div className="text-[10px] text-[#8c867e] uppercase font-bold">Perdas Totais</div>
                    <div className="text-base font-bold font-mono text-[#f87171] mt-0.5">
                      {formatNumberBR(result.metrics.totalPerdas)}
                    </div>
                    <div className="text-[10px] text-[#f87171]">
                      {formatPercentBR(result.metrics.perdaPct)} da enforna
                    </div>
                  </div>
                </div>
              </div>

              {/* OVERVIEW OF PERDAS BY OVEN */}
              {result.ovenBreakdown && result.ovenBreakdown.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#242320] border border-[#2e2d2a]">
                  <div className="text-xs font-bold text-[#f4efe6] mb-2 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-[#fb923c]" />
                    <span>Divisão por Forno Identificado:</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[#2e2d2a] text-[10px] text-[#8c867e] uppercase font-bold">
                          <th className="py-1.5 pr-2">Forno</th>
                          <th className="py-1.5 px-2 text-right">Câmaras</th>
                          <th className="py-1.5 px-2 text-right">Enforna</th>
                          <th className="py-1.5 px-2 text-right">Desenforna</th>
                          <th className="py-1.5 px-2 text-right text-[#f87171]">Perda</th>
                          <th className="py-1.5 pl-2 text-right text-[#f87171]">% Perda</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2926] font-mono">
                        {result.ovenBreakdown.map((row) => (
                          <tr key={row.forno} className="hover:bg-[#282724]">
                            <td className="py-1.5 pr-2 font-sans font-bold text-[#f4efe6]">{row.forno}</td>
                            <td className="py-1.5 px-2 text-right text-[#8c867e]">{row.camaras}</td>
                            <td className="py-1.5 px-2 text-right text-[#38bdf8] font-semibold">{formatNumberBR(row.enforna)}</td>
                            <td className="py-1.5 px-2 text-right text-[#fb923c] font-semibold">{formatNumberBR(row.desenforna)}</td>
                            <td className="py-1.5 px-2 text-right text-[#f87171] font-semibold">{formatNumberBR(row.perda)}</td>
                            <td className="py-1.5 pl-2 text-right text-[#f87171] font-semibold">{formatPercentBR(row.perdaPct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Defect Breakdown preview */}
              <div className="p-3.5 rounded-xl bg-[#242320] border border-[#2e2d2a]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-[#f4efe6]">Composição de Perdas</span>
                  <span className="text-[#fb923c] font-bold">
                    Maior Causa: {result.metrics.maiorCausaNome} ({formatPercentBR(result.metrics.maiorCausaPct, 0)})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-[#1c1b19] border-l-2 border-l-[#eab308]">
                    <div className="text-[10px] font-sans text-[#8c867e]">2ª Linha</div>
                    <div className="font-bold text-[#eab308]">
                      {formatNumberBR(result.metrics.perda2Grau)}
                    </div>
                    <div className="text-[10px] text-[#8c867e] font-sans">
                      {formatPercentBR(result.metrics.perda2GrauPct)}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#1c1b19] border-l-2 border-l-[#60a5fa]">
                    <div className="text-[10px] font-sans text-[#8c867e]">Crua</div>
                    <div className="font-bold text-[#60a5fa]">
                      {formatNumberBR(result.metrics.perdaCrua)}
                    </div>
                    <div className="text-[10px] text-[#8c867e] font-sans">
                      {formatPercentBR(result.metrics.perdaCruaPct)}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#1c1b19] border-l-2 border-l-[#f87171]">
                    <div className="text-[10px] font-sans text-[#8c867e]">Trinca</div>
                    <div className="font-bold text-[#f87171]">
                      {formatNumberBR(result.metrics.perdaTrinca)}
                    </div>
                    <div className="text-[10px] text-[#8c867e] font-sans">
                      {formatPercentBR(result.metrics.perdaTrincaPct)}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#1c1b19] border-l-2 border-l-[#fb923c]">
                    <div className="text-[10px] font-sans text-[#8c867e]">Quebra</div>
                    <div className="font-bold text-[#fb923c]">
                      {formatNumberBR(result.metrics.perdaQuebra)}
                    </div>
                    <div className="text-[10px] text-[#8c867e] font-sans">
                      {formatPercentBR(result.metrics.perdaQuebraPct)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8c867e] mb-1.5">
                  Como deseja adicionar estes dados?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Mode 1: Keep Months (Recommended) */}
                  <button
                    type="button"
                    onClick={() => setImportMode('keep-months')}
                    className={`p-3 text-left rounded-xl border text-xs transition-all relative ${
                      importMode === 'keep-months'
                        ? 'bg-[#c85a2b]/20 border-[#c85a2b] text-[#f4efe6] ring-1 ring-[#c85a2b]'
                        : 'bg-[#242320] border-[#33312e] text-[#b0aba2] hover:bg-[#2a2926]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#f4efe6]">
                        Acumular ao Histórico
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/40">
                        Não Mescla
                      </span>
                    </div>
                    <div className="text-[11px] text-[#ded8ce] font-medium leading-tight">
                      Mantém os meses anteriores 100% intactos e adiciona este mês para comparar lado a lado.
                    </div>
                  </button>

                  {/* Mode 2: Replace */}
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 text-left rounded-xl border text-xs transition-all ${
                      importMode === 'replace'
                        ? 'bg-[#c85a2b]/20 border-[#c85a2b] text-[#f4efe6] ring-1 ring-[#c85a2b]'
                        : 'bg-[#242320] border-[#33312e] text-[#b0aba2] hover:bg-[#2a2926]'
                    }`}
                  >
                    <div className="font-bold text-xs mb-1 text-[#f4efe6]">
                      Substituir Toda a Base
                    </div>
                    <div className="text-[11px] text-[#8c867e] leading-tight">
                      Apaga os meses anteriores e deixa apenas esta planilha ativa no dashboard.
                    </div>
                  </button>

                  {/* Mode 3: Append */}
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`p-3 text-left rounded-xl border text-xs transition-all ${
                      importMode === 'append'
                        ? 'bg-[#c85a2b]/20 border-[#c85a2b] text-[#f4efe6] ring-1 ring-[#c85a2b]'
                        : 'bg-[#242320] border-[#33312e] text-[#b0aba2] hover:bg-[#2a2926]'
                    }`}
                  >
                    <div className="font-bold text-xs mb-1 text-[#f4efe6]">
                      Acrescentar Câmaras
                    </div>
                    <div className="text-[11px] text-[#8c867e] leading-tight">
                      Soma novas câmaras à base existente atualizando duplicatas.
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sample template link */}
          <div className="pt-2 flex items-center justify-between text-xs text-[#8c867e]">
            <span>Dúvidas no formato da planilha?</span>
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 text-[#38bdf8] hover:underline font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar modelo .xlsx</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#2e2d2a] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#272623] hover:bg-[#33312c] text-[#b0aba2] hover:text-[#f4efe6] transition-colors"
          >
            Fechar
          </button>

          {result && (
            <button
              type="button"
              onClick={handleApplyToDashboard}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-[#c85a2b] hover:bg-[#b84f23] text-white shadow-md transition-colors cursor-pointer"
            >
              <span>Aplicar {result.records.length} Câmaras no Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
