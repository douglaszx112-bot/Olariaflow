/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChamberRecord, FilterState, LossCategory, DashboardTab, AutoRefreshOption, AlertThresholds } from './types';
import {
  computeDailySummaries,
  computeOvenSummaries,
  computeSummaryMetrics,
  filterRecords,
  getAvailableMonths,
  formatMonthYearBR,
  deduplicateRecords,
} from './utils/calculations';
import { exportDashboardToPdf } from './utils/pdfExport';
import { Header } from './components/Header';
import { FiltersBar } from './components/FiltersBar';
import { KpiCards } from './components/KpiCards';
import { DashboardTabs } from './components/DashboardTabs';
import { MonthlyComparison } from './components/MonthlyComparison';
import { OvenTable } from './components/OvenTable';
import { LossTypeCards } from './components/LossTypeCards';
import { LossByOvenChart } from './components/LossByOvenChart';
import { ProductionDailyChart } from './components/ProductionDailyChart';
import { LossDailyChart } from './components/LossDailyChart';
import { AnomalyTable } from './components/AnomalyTable';
import { ImportModal, ImportModeType } from './components/ImportModal';
import { FinancialWasteModal } from './components/FinancialWasteModal';
import { NewRecordModal } from './components/NewRecordModal';
import { ChamberDetailModal } from './components/ChamberDetailModal';
import { ShareSyncModal } from './components/ShareSyncModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ThresholdAlertsModal } from './components/ThresholdAlertsModal';
import {
  CheckCircle2,
  X,
  FileSpreadsheet,
  Upload,
  Plus,
  Users,
  Loader2,
  Lock,
  ShieldCheck,
  Minimize2,
  Tv,
} from 'lucide-react';

export default function App() {
  // Main data state with zeroed baseline
  const [records, setRecords] = useState<ChamberRecord[]>(() => {
    try {
      const hasCustom = localStorage.getItem('telha_canal_has_custom_upload');
      if (hasCustom === 'true') {
        const saved = localStorage.getItem('telha_canal_records');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Filter out any legacy inflated summary rows (> 150k pieces)
            return parsed.filter(
              (r: ChamberRecord) =>
                r.enforna <= 150000 &&
                r.desenforna <= 150000 &&
                (r.enforna > 0 || r.desenforna > 0)
            );
          }
        }
      } else {
        localStorage.removeItem('telha_canal_records');
        localStorage.removeItem('telha_canal_dataset_name');
        localStorage.removeItem('telha_canal_last_updated');
      }
    } catch (e) {
      console.warn('Falha ao restaurar dados do localStorage:', e);
    }
    return [];
  });

  const [datasetName, setDatasetName] = useState<string>(() => {
    return localStorage.getItem('telha_canal_dataset_name') || 'Aguardando planilha (.xlsx)';
  });

  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return localStorage.getItem('telha_canal_last_updated') || '';
  });

  // Cloud sync tracking
  const [currentVersion, setCurrentVersion] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // PDF Export states (jsPDF + html2canvas)
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfProgressText, setPdfProgressText] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Dashboard Tab state: 'visao-geral' | 'comparativo' | 'perdas' | 'graficos' (default: 'visao-geral')
  const [activeTab, setActiveTab] = useState<DashboardTab>('visao-geral');

  // Track browser print events to stack all tabs on paper
  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Success toast message
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Admin Protection states (Item 1 & 4: Uses session tokens and avoids URL password leakage)
  const [adminToken, setAdminToken] = useState<string>(() => {
    try {
      return sessionStorage.getItem('telha_canal_admin_token') || localStorage.getItem('telha_canal_admin_token') || '';
    } catch {
      return '';
    }
  });

  const [mustChangePin, setMustChangePin] = useState<boolean>(false);
  const [hasBackup, setHasBackup] = useState<boolean>(false);

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('mode') || urlParams.get('role') || urlParams.get('access');

        // Explicit view-only link provided to team
        if (modeParam === 'view' || modeParam === 'readonly' || modeParam === 'viewer') {
          return false;
        }

        // Active admin session token in storage
        const savedToken = sessionStorage.getItem('telha_canal_admin_token') || localStorage.getItem('telha_canal_admin_token');
        if (savedToken) return true;
      }
    } catch {}
    return false;
  });

  // Check auth health and strip legacy key param from URL if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Item 1: If key was passed in URL, strip it immediately from browser history/address bar
      if (window.location.search.includes('key=')) {
        const url = new URL(window.location.href);
        const legacyKey = url.searchParams.get('key');
        url.searchParams.delete('key');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));

        if (legacyKey) {
          fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: legacyKey }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.success && data.token) {
                setAdminToken(data.token);
                sessionStorage.setItem('telha_canal_admin_token', data.token);
                setIsAdmin(true);
              }
            })
            .catch(() => {});
        }
      }

      // Check auth status
      fetch('/api/auth/status')
        .then((r) => r.json())
        .then((data) => {
          if (data.mustChangePin) setMustChangePin(true);
        })
        .catch(() => {});

      // Check backup status
      fetch('/api/records/backup-status')
        .then((r) => r.json())
        .then((data) => {
          if (data.hasBackup) setHasBackup(true);
        })
        .catch(() => {});
    }
  }, []);

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [isShareSyncOpen, setIsShareSyncOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState<ChamberRecord | null>(null);

  // Threshold Alerts states (configurable by Admin)
  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds>(() => {
    try {
      const saved = localStorage.getItem('telha_canal_alert_thresholds');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.criticalLossPct === 'number' && typeof parsed.warningLossPct === 'number') {
          return parsed;
        }
      }
    } catch {}
    return { criticalLossPct: 15, warningLossPct: 10 };
  });

  const handleSaveAlertThresholds = useCallback((newThresholds: AlertThresholds) => {
    setAlertThresholds(newThresholds);
    try {
      localStorage.setItem('telha_canal_alert_thresholds', JSON.stringify(newThresholds));
    } catch {}
    setSuccessToast(
      `Limiares de alerta salvos: Crítico > ${newThresholds.criticalLossPct}%, Atenção > ${newThresholds.warningLossPct}%.`
    );
    setTimeout(() => setSuccessToast(null), 4000);
  }, []);

  // In-app Confirmation Modal (replaces blocked window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    confirmVariant: 'danger' | 'warning' | 'primary';
    icon: 'trash' | 'restore' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: '',
    confirmVariant: 'primary',
    icon: 'warning',
    onConfirm: () => {},
  });

  // Presentation Mode (TV / Factory Monitors)
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('mode') === 'tv' || urlParams.get('presentation') === 'true';
      }
    } catch {}
    return false;
  });

  const handleTogglePresentation = useCallback(() => {
    setIsPresentationMode((prev) => {
      const next = !prev;
      if (next) {
        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
          }
        } catch {}
      } else {
        try {
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          }
        } catch {}
      }
      return next;
    });
  }, []);

  // Listen to Escape key and browser fullscreen change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresentationMode) {
        setIsPresentationMode(false);
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isPresentationMode) {
        setIsPresentationMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isPresentationMode]);

  // Fetch shared records from cloud backend
  const fetchSharedRecords = useCallback(async (showToast = false) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/records');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.records) && data.records.length > 0) {
          setRecords(data.records);
          setDatasetName(data.datasetName || 'Planilha compartilhada');
          setLastUpdated(data.lastUpdated || '');
          setCurrentVersion(data.version || 1);
          localStorage.setItem('telha_canal_has_custom_upload', 'true');
          localStorage.setItem('telha_canal_records', JSON.stringify(data.records));
          localStorage.setItem('telha_canal_dataset_name', data.datasetName);
          localStorage.setItem('telha_canal_last_updated', data.lastUpdated);

          if (showToast) {
            setSuccessToast(`Base sincronizada com a nuvem! ${data.records.length} câmaras ativas.`);
            setTimeout(() => setSuccessToast(null), 4000);
          }
        }
      }
    } catch (e) {
      console.warn('Backend API não disponível no momento, usando modo local:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Configurable Auto-refresh interval ('30s' | '1min' | '5min' | 'off')
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<AutoRefreshOption>(() => {
    try {
      const saved = localStorage.getItem('olariaflow_auto_refresh');
      if (saved === '30s' || saved === '1min' || saved === '5min' || saved === 'off') {
        return saved;
      }
    } catch {}
    return '1min';
  });

  const handleSetAutoRefreshInterval = useCallback((val: AutoRefreshOption) => {
    setAutoRefreshInterval(val);
    try {
      localStorage.setItem('olariaflow_auto_refresh', val);
    } catch {}
    const labelMap: Record<AutoRefreshOption, string> = {
      '30s': '30 segundos',
      '1min': '1 minuto',
      '5min': '5 minutos',
      'off': 'desativado',
    };
    if (val === 'off') {
      setSuccessToast('Auto-refresh desativado.');
    } else {
      setSuccessToast(`Auto-refresh configurado para sincronizar a cada ${labelMap[val]}.`);
    }
    setTimeout(() => setSuccessToast(null), 3000);
  }, []);

  const handleManualRefresh = useCallback(() => {
    fetchSharedRecords(true);
  }, [fetchSharedRecords]);

  // Sync on initial load + configurable auto-refresh interval
  useEffect(() => {
    fetchSharedRecords(false);

    if (autoRefreshInterval === 'off') return;

    const intervalMs =
      autoRefreshInterval === '30s'
        ? 30000
        : autoRefreshInterval === '1min'
        ? 60000
        : 300000; // 5min

    const interval = setInterval(() => {
      fetchSharedRecords(false);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [fetchSharedRecords, autoRefreshInterval]);

  // Compute available dates from dataset
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(records.map((r) => r.data))).sort();
    return dates;
  }, [records]);

  // Compute available months from dataset (sorted latest first)
  const availableMonths = useMemo(() => {
    return getAvailableMonths(records);
  }, [records]);

  const minDate = availableDates[0] || '';
  const maxDate = availableDates[availableDates.length - 1] || '';

  // Filter state with month floating capability
  const [filters, setFilters] = useState<FilterState>(() => ({
    forno: 'all',
    perdaTipo: 'all',
    startDate: minDate,
    endDate: maxDate,
    searchTerm: '',
    selectedMonth: 'all',
  }));

  // Dates scoped to active selected month (or all dates if 'all')
  const activeDates = useMemo(() => {
    if (filters.selectedMonth === 'all' || !filters.selectedMonth) return availableDates;
    return availableDates.filter((d) => d.startsWith(filters.selectedMonth));
  }, [availableDates, filters.selectedMonth]);

  const activeMinDate = activeDates[0] || minDate;
  const activeMaxDate = activeDates[activeDates.length - 1] || maxDate;

  // Month navigation / floating handler
  const handleSelectMonth = useCallback(
    (monthKey: string) => {
      if (monthKey === 'all') {
        setFilters((prev) => ({
          ...prev,
          selectedMonth: 'all',
          startDate: minDate,
          endDate: maxDate,
        }));
      } else {
        const monthDates = records
          .filter((r) => r.data && r.data.startsWith(monthKey))
          .map((r) => r.data)
          .sort();
        setFilters((prev) => ({
          ...prev,
          selectedMonth: monthKey,
          startDate: monthDates[0] || `${monthKey}-01`,
          endDate: monthDates[monthDates.length - 1] || `${monthKey}-31`,
        }));
      }
    },
    [minDate, maxDate, records]
  );

  // Sync filters whenever date boundary changes or month changes
  useEffect(() => {
    if (availableDates.length > 0) {
      if (filters.selectedMonth === 'all') {
        setFilters((prev) => {
          const isStartValid = prev.startDate && availableDates.includes(prev.startDate);
          const isEndValid = prev.endDate && availableDates.includes(prev.endDate);
          if (!isStartValid || !isEndValid) {
            return {
              ...prev,
              startDate: minDate,
              endDate: maxDate,
            };
          }
          return prev;
        });
      } else {
        const isMonthAvailable = availableMonths.some((m) => m.monthKey === filters.selectedMonth);
        const monthDates = records
          .filter((r) => r.data && r.data.startsWith(filters.selectedMonth))
          .map((r) => r.data)
          .sort();
        if (isMonthAvailable && monthDates.length > 0) {
          setFilters((prev) => {
            const isStartInMonth = prev.startDate && prev.startDate.startsWith(filters.selectedMonth) && monthDates.includes(prev.startDate);
            const isEndInMonth = prev.endDate && prev.endDate.startsWith(filters.selectedMonth) && monthDates.includes(prev.endDate);
            if (!isStartInMonth || !isEndInMonth) {
              return {
                ...prev,
                startDate: monthDates[0],
                endDate: monthDates[monthDates.length - 1],
              };
            }
            return prev;
          });
        } else {
          // If the selected month is no longer available or has 0 records (e.g. empty August),
          // fallback immediately to the primary available month so KPIs (5.788.300 / 5.543.920 / 261.710) appear!
          const fallbackMonth = availableMonths[0]?.monthKey || 'all';
          const fallbackDates = fallbackMonth === 'all'
            ? availableDates
            : records.filter((r) => r.data && r.data.startsWith(fallbackMonth)).map((r) => r.data).sort();
          setFilters((prev) => ({
            ...prev,
            selectedMonth: fallbackMonth,
            startDate: fallbackDates[0] || minDate,
            endDate: fallbackDates[fallbackDates.length - 1] || maxDate,
          }));
        }
      }
    } else {
      setFilters((prev) => ({
        ...prev,
        startDate: '',
        endDate: '',
        selectedMonth: 'all',
      }));
    }
  }, [minDate, maxDate, availableDates, filters.selectedMonth, records]);

  // Derived filtered dataset
  const filteredRecords = useMemo(() => {
    return filterRecords(records, filters);
  }, [records, filters]);

  // Aggregate metrics
  const summaryMetrics = useMemo(() => {
    return computeSummaryMetrics(filteredRecords, filters.perdaTipo);
  }, [filteredRecords, filters.perdaTipo]);

  // Oven breakdown
  const ovenSummaries = useMemo(() => {
    return computeOvenSummaries(filteredRecords);
  }, [filteredRecords]);

  // Daily timeline breakdown
  const dailySummaries = useMemo(() => {
    return computeDailySummaries(filteredRecords, filters.perdaTipo);
  }, [filteredRecords, filters.perdaTipo]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  // PDF Export using jsPDF & html2canvas
  const handleExportPdf = async () => {
    const targetEl = document.getElementById('dashboard-report-content');
    if (!targetEl) return;

    setIsExportingPdf(true);
    // Allow state change to trigger re-render so all tabs are mounted and rendered for the capture
    await new Promise((resolve) => setTimeout(resolve, 150));

    const fornoScope = filters.forno === 'all' ? 'Todos_os_Fornos' : filters.forno.replace(/\s+/g, '_');
    const dateScope = filters.startDate ? `_${filters.startDate}_a_${filters.endDate}` : '';
    const fileName = `Relatorio_Producao_Telha_Canal_${fornoScope}${dateScope}.pdf`;
    const title =
      filters.forno === 'all'
        ? 'Telha Canal — Relatório de Produção e Perdas (Todos os Fornos)'
        : `Telha Canal — Relatório de Produção (${filters.forno})`;

    try {
      await exportDashboardToPdf(targetEl, {
        fileName,
        title,
        onProgress: (status) => setPdfProgressText(status),
      });
      setSuccessToast('Relatório PDF completo baixado com sucesso!');
      setTimeout(() => setSuccessToast(null), 4500);
    } catch (error) {
      console.error('Erro ao gerar relatório em PDF:', error);
      setSuccessToast('Não foi possível gerar o PDF. Tente novamente.');
      setTimeout(() => setSuccessToast(null), 4000);
    } finally {
      setIsExportingPdf(false);
      setPdfProgressText(null);
    }
  };

  // When user uploads a spreadsheet: save locally AND push to backend server for all users!
  const handleImportSuccess = async (
    newRecords: ChamberRecord[],
    mode: ImportModeType,
    sourceName: string,
    discardedRowsCount: number = 0
  ) => {
    const now = new Date();
    const timeFormatted = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    setLastUpdated(timeFormatted);

    // Extract month keys from new records (e.g. ['2026-09'])
    const uploadedMonthKeys = Array.from(
      new Set(
        newRecords
          .map((r) => (r.data && r.data.length >= 7 ? r.data.slice(0, 7) : ''))
          .filter(Boolean)
      )
    );

    let finalRecordsList = newRecords;
    let newDatasetName = `planilha: ${sourceName}`;

    const discardedNotice =
      discardedRowsCount > 0
        ? ` (${discardedRowsCount} linha${discardedRowsCount > 1 ? 's' : ''} de total/resumo descartada${discardedRowsCount > 1 ? 's' : ''})`
        : '';

    if (mode === 'keep-months') {
      // Keep existing records of other months intact, and update/add the uploaded month(s)
      const baseRecords = records.length > 0 ? records : (() => {
        try {
          const s = localStorage.getItem('telha_canal_records');
          return s ? JSON.parse(s) : [];
        } catch { return []; }
      })();

      const otherMonthsRecords = baseRecords.filter(
        (r: ChamberRecord) => !uploadedMonthKeys.includes(r.data ? r.data.slice(0, 7) : '')
      );
      finalRecordsList = deduplicateRecords([...otherMonthsRecords, ...newRecords]);

      const allResultMonths = getAvailableMonths(finalRecordsList);
      newDatasetName =
        allResultMonths.length > 1
          ? `Histórico (${allResultMonths.map((m) => m.label).join(', ')})`
          : `planilha: ${sourceName}`;

      setRecords(finalRecordsList);
      setDatasetName(newDatasetName);

      // Automatically float/navigate to the newly uploaded month!
      const targetMonth = uploadedMonthKeys[0] || 'all';
      const targetMonthDates = finalRecordsList
        .filter((r) => r.data && r.data.startsWith(targetMonth))
        .map((r) => r.data)
        .sort();

      setFilters((prev) => ({
        ...prev,
        forno: 'all',
        perdaTipo: 'all',
        selectedMonth: targetMonth,
        startDate: targetMonthDates[0] || '',
        endDate: targetMonthDates[targetMonthDates.length - 1] || '',
      }));

      const monthLabels = uploadedMonthKeys.map(formatMonthYearBR).join(', ');
      setSuccessToast(
        `Mês ${monthLabels} adicionado ao histórico!${discardedNotice}`
      );
    } else if (mode === 'replace') {
      finalRecordsList = newRecords;
      setRecords(newRecords);
      setDatasetName(newDatasetName);
      const newDates = Array.from(new Set(newRecords.map((r) => r.data))).sort();
      const firstMonth = newDates[0] ? newDates[0].slice(0, 7) : 'all';
      setFilters((prev) => ({
        ...prev,
        forno: 'all',
        perdaTipo: 'all',
        selectedMonth: firstMonth,
        startDate: newDates[0] || '',
        endDate: newDates[newDates.length - 1] || '',
      }));
      setSuccessToast(`Base substituída! ${newRecords.length} câmaras carregadas.${discardedNotice}`);
    } else {
      // append
      finalRecordsList = deduplicateRecords([...records, ...newRecords]);
      newDatasetName = `${datasetName} + ${sourceName}`;
      setRecords(finalRecordsList);
      setDatasetName(newDatasetName);
      setSuccessToast(`Câmaras acrescentadas ao histórico com sucesso!${discardedNotice}`);
    }

    // Save to localStorage
    localStorage.setItem('telha_canal_has_custom_upload', 'true');
    localStorage.setItem('telha_canal_records', JSON.stringify(finalRecordsList));
    localStorage.setItem('telha_canal_dataset_name', newDatasetName);
    localStorage.setItem('telha_canal_last_updated', timeFormatted);

    // Helper to get authorized request headers (session token)
    const getAuthHeaders = (): Record<string, string> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (adminToken) headers['x-admin-token'] = adminToken;
      return headers;
    };

    // Broadcast to backend for everyone to see in real-time!
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          records: finalRecordsList,
          datasetName: newDatasetName,
          lastUpdated: timeFormatted,
        }),
      });

      if (!res.ok && res.status === 403) {
        setSuccessToast('Acesso negado: Somente o Administrador pode abastecer novas planilhas.');
        setIsAdminAuthModalOpen(true);
        return;
      }

      setHasBackup(true);
      setSuccessToast(`Base sincronizada com a nuvem! Todos com o link do app verão esta atualização.`);
    } catch {
      setSuccessToast(`Base carregada com sucesso! ${finalRecordsList.length} câmaras processadas.`);
    }

    setTimeout(() => {
      setSuccessToast(null);
    }, 5000);
  };

  const handleRequestResetData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Zerar Base de Dados',
      description:
        'Atenção: Deseja realmente zerar todos os registros de produção do painel? Uma cópia de backup do estado anterior será salva automaticamente no servidor.',
      confirmLabel: 'Sim, zerar base',
      confirmVariant: 'danger',
      icon: 'trash',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await executeResetData();
      },
    });
  };

  const executeResetData = async () => {
    try {
      localStorage.removeItem('telha_canal_has_custom_upload');
      localStorage.removeItem('telha_canal_records');
      localStorage.removeItem('telha_canal_dataset_name');
      localStorage.removeItem('telha_canal_last_updated');
      const headers: Record<string, string> = {};
      if (adminToken) headers['x-admin-token'] = adminToken;

      await fetch('/api/records', {
        method: 'DELETE',
        headers,
      });
      setHasBackup(true);
    } catch {}

    setRecords([]);
    setDatasetName('Aguardando planilha (.xlsx)');
    setLastUpdated('');
    setFilters({
      forno: 'all',
      perdaTipo: 'all',
      startDate: '',
      endDate: '',
      searchTerm: '',
      selectedMonth: 'all',
    });
    setSuccessToast('Base zerada com sucesso! Cópia de segurança preservada no servidor.');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleRequestRestoreBackup = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Restaurar Cópia de Backup',
      description:
        'Deseja restaurar a última cópia de backup do servidor? Os dados atuais serão revertidos para a versão anterior gravada.',
      confirmLabel: 'Sim, restaurar backup',
      confirmVariant: 'primary',
      icon: 'restore',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await executeRestoreBackup();
      },
    });
  };

  const executeRestoreBackup = async () => {
    try {
      const headers: Record<string, string> = {};
      if (adminToken) headers['x-admin-token'] = adminToken;

      const res = await fetch('/api/records/restore-backup', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessToast('Cópia de backup restaurada com sucesso!');
        await fetchSharedRecords(false);
      } else {
        setSuccessToast(data.error || 'Não foi possível restaurar o backup.');
      }
    } catch {
      setSuccessToast('Erro de conexão ao restaurar backup.');
    }
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleAddManualRecord = async (record: ChamberRecord) => {
    const updated = [record, ...records];
    setRecords(updated);
    const newName = datasetName === 'Aguardando planilha (.xlsx)' ? 'Lançamentos Manuais' : datasetName;
    setDatasetName(newName);
    setSuccessToast(`Câmara ${record.camara} de ${record.forno} lançada!`);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (adminToken) headers['x-admin-token'] = adminToken;

      await fetch('/api/records', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          records: updated,
          datasetName: newName,
          lastUpdated: new Date().toLocaleString('pt-BR'),
        }),
      });
      setHasBackup(true);
    } catch {}

    setTimeout(() => setSuccessToast(null), 4000);
  };

  const scopeLabel =
    filters.forno === 'all'
      ? 'Todos os fornos'
      : `${filters.forno}${filters.perdaTipo !== 'all' ? ` · Perda: ${filters.perdaTipo}` : ''}`;

  return (
    <div className="min-h-screen bg-[#121110] text-[#f4efe6] pb-12 selection:bg-[#ea580c] selection:text-white">
      {/* Floating PDF Generation Progress Toast */}
      {pdfProgressText && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#1c1b19] border border-[#ea580c] shadow-2xl flex items-center gap-3 text-xs sm:text-sm text-[#f4efe6] animate-in fade-in slide-in-from-bottom-2 no-print">
          <Loader2 className="w-5 h-5 text-[#ea580c] animate-spin shrink-0" />
          <div>
            <div className="font-bold text-[#ea580c]">Gerando Relatório PDF...</div>
            <div className="text-xs text-[#b0aba2] mt-0.5">{pdfProgressText}</div>
          </div>
        </div>
      )}

      <main
        id="dashboard-report-content"
        className={`mx-auto px-3 sm:px-6 pt-4 sm:pt-6 transition-all duration-300 ${
          isPresentationMode
            ? 'w-full max-w-[1920px]'
            : 'max-w-3xl lg:max-w-4xl xl:max-w-5xl'
        }`}
      >
        {/* Success Toast */}
        {successToast && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/30 text-xs sm:text-sm text-[#4ade80] flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 no-print">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="p-1 text-[#8c867e] hover:text-[#f4efe6]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Header with quick actions, PDF download and cloud sync */}
        <Header
          fornoFilter={filters.forno}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onExportPdf={handleExportPdf}
          isExportingPdf={isExportingPdf}
          onOpenFinancial={() => setIsFinancialModalOpen(true)}
          onOpenImport={() => setIsImportModalOpen(true)}
          onOpenShareSync={() => setIsShareSyncOpen(true)}
          isAdmin={isAdmin}
          onOpenAdminAuth={() => setIsAdminAuthModalOpen(true)}
          isPresentationMode={isPresentationMode}
          onTogglePresentationMode={handleTogglePresentation}
          availableMonths={availableMonths}
          selectedMonth={filters.selectedMonth}
          onSelectMonth={handleSelectMonth}
          autoRefreshInterval={autoRefreshInterval}
          onSetAutoRefreshInterval={handleSetAutoRefreshInterval}
          isSyncing={isSyncing}
          onManualRefresh={handleManualRefresh}
          alertThresholds={alertThresholds}
          onOpenAlertSettings={() => setIsAlertModalOpen(true)}
        />

        {/* Team Collaboration Banner (Hidden in presentation mode) */}
        {!isPresentationMode && (
          <div className="mb-4 p-3 rounded-xl bg-[#1c1b19] border border-[#2a2926] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs no-print">
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-lg ${
                  isAdmin ? 'bg-[#ea580c]/15 text-[#ea580c]' : 'bg-[#22c55e]/15 text-[#4ade80]'
                }`}
              >
                {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              </span>
              <span className="text-[#ded8ce]">
                {isAdmin ? (
                  <>
                    <strong className="text-[#f4efe6]">Painel do Administrador:</strong> Apenas você pode abastecer novas planilhas (.xlsx). O link compartilhado para a equipe é protegido em somente leitura.
                  </>
                ) : (
                  <>
                    <strong className="text-[#f4efe6]">Modo Visualização (Equipe):</strong> Acesso de leitura aos relatórios e gráficos. O abastecimento de novas planilhas é restrito ao Administrador.
                  </>
                )}
              </span>
            </div>
            {isAdmin ? (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsShareSyncOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#272623] hover:bg-[#34332f] text-[#4ade80] border border-[#22c55e]/30 font-semibold cursor-pointer"
                >
                  <span>Link para a equipe</span>
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Zeroed State Callout Banner when no data is loaded yet (Hidden in presentation mode) */}
        {!isPresentationMode && records.length === 0 && (
          <div className="mb-6 p-6 sm:p-8 rounded-2xl bg-[#1c1b19] border border-dashed border-[#ea580c]/50 text-center shadow-lg animate-in fade-in no-print">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#ea580c]/15 text-[#ea580c] flex items-center justify-center border border-[#ea580c]/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#f4efe6]">
              {isAdmin ? 'Base Zerada — Pronto para Adicionar sua Planilha' : 'Aguardando Lançamento de Dados'}
            </h2>
            <p className="text-xs sm:text-sm text-[#9e988f] max-w-lg mx-auto mt-1.5 mb-5">
              {isAdmin
                ? 'Todos os valores originais foram zerados. Envie sua planilha diária de controle de queima (.xlsx) para carregar os dados reais da fábrica e sincronizar automaticamente para todos que têm acesso ao app.'
                : 'A base de dados atual está zerada. Os relatórios e gráficos serão exibidos automaticamente assim que a administração abastecer a nova planilha.'}
            </p>
            {isAdmin ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-[#c85a2b] hover:bg-[#b84f23] text-white shadow-md transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>+ Adicionar base (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewRecordModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#ded8ce] border border-[#393733] transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#38bdf8]" />
                  <span>Lançar Câmara Manual</span>
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Filters and Dataset Control Card (Hidden in presentation mode) */}
        {!isPresentationMode && (
          <FiltersBar
            filters={filters}
            onFilterChange={handleFilterChange}
            availableDates={activeDates}
            totalChambersCount={records.length}
            filteredChambersCount={filteredRecords.length}
            datasetName={datasetName}
            lastUpdated={lastUpdated}
            onOpenImport={() => setIsImportModalOpen(true)}
            onOpenNewRecord={() => setIsNewRecordModalOpen(true)}
            onRestoreBackup={handleRequestRestoreBackup}
            onResetData={handleRequestResetData}
            hasBackup={hasBackup}
            minDate={activeMinDate}
            maxDate={activeMaxDate}
            isAdmin={isAdmin}
            onOpenAdminAuth={() => setIsAdminAuthModalOpen(true)}
            availableMonths={availableMonths}
            onSelectMonth={handleSelectMonth}
          />
        )}

        {/* 1. KPIs Section — Maximized and Enlarged in Presentation Mode (Always visible on all tabs) */}
        <KpiCards
          metrics={summaryMetrics}
          isPresentationMode={isPresentationMode}
          alertThresholds={alertThresholds}
          onOpenAlertSettings={() => setIsAlertModalOpen(true)}
        />

        {/* Tab Navigation Bar — Positioned below KpiCards, visible across normal browsing mode */}
        {!isPresentationMode && !isExportingPdf && !isPrinting && (
          <DashboardTabs
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            ovensCount={ovenSummaries.length}
          />
        )}

        {/* Dynamic Presentation Layout for Factory Monitors vs Regular Layout */}
        {isPresentationMode ? (
          <div className="space-y-6">
            {/* Row 1: Perdas por Tipo & % Perda por Forno em 2 Colunas Lado a Lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LossTypeCards
                metrics={summaryMetrics}
                selectedCategory={filters.perdaTipo}
                onSelectCategory={(cat: LossCategory) => handleFilterChange({ perdaTipo: cat })}
                scopeLabel={scopeLabel}
              />
              <LossByOvenChart
                ovens={ovenSummaries}
                selectedOven={filters.forno}
                onSelectOven={(oven) => handleFilterChange({ forno: oven })}
              />
            </div>

            {/* Row 2: Enforna x Desenforna Diária & % de Perda Diária */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProductionDailyChart
                data={dailySummaries}
                scopeLabel={scopeLabel}
              />
              <LossDailyChart
                data={dailySummaries}
                averageLossPct={summaryMetrics.perdaPct}
                scopeLabel={scopeLabel}
              />
            </div>

            {/* Row 3: Comparativo Mensal & Tabela Resumo dos Fornos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthlyComparison records={records} activeMonthKey={filters.selectedMonth} />
              <OvenTable
                ovens={ovenSummaries}
                selectedOven={filters.forno}
                onSelectOven={(oven) => handleFilterChange({ forno: oven })}
              />
            </div>

            {/* Row 4: Câmaras Críticas com Maior Perda (Alerta de Linha de Produção) */}
            <AnomalyTable
              records={filteredRecords}
              scopeLabel={scopeLabel}
              perdaTipo={filters.perdaTipo}
              onSelectChamber={(chamber) => setSelectedChamber(chamber)}
              alertThresholds={alertThresholds}
              onOpenAlertSettings={() => setIsAlertModalOpen(true)}
            />
          </div>
        ) : isExportingPdf || isPrinting ? (
          /* Modo Impressão / PDF: Mostra TODAS as abas empilhadas sequencialmente */
          <div className="space-y-8">
            {/* 1. Visão Geral: OvenTable + AnomalyTable */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#2e2d2a] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                  1. Visão Geral da Produção
                </span>
                <span className="text-xs text-[#9e988f]">· Resultado por forno e câmaras críticas</span>
              </div>
              <OvenTable
                ovens={ovenSummaries}
                selectedOven={filters.forno}
                onSelectOven={(oven) => handleFilterChange({ forno: oven })}
              />
              <AnomalyTable
                records={filteredRecords}
                scopeLabel={scopeLabel}
                perdaTipo={filters.perdaTipo}
                onSelectChamber={(chamber) => setSelectedChamber(chamber)}
                alertThresholds={alertThresholds}
                onOpenAlertSettings={() => setIsAlertModalOpen(true)}
              />
            </div>

            {/* 2. Comparativo Mensal */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#2e2d2a] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                  2. Comparativo Mensal
                </span>
                <span className="text-xs text-[#9e988f]">· Evolução de eficiência e histórico</span>
              </div>
              <MonthlyComparison records={records} activeMonthKey={filters.selectedMonth} />
            </div>

            {/* 3. Perdas por Tipo: LossTypeCards + LossByOvenChart */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#2e2d2a] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                  3. Perdas por Tipo de Defeito
                </span>
                <span className="text-xs text-[#9e988f]">· Trinca, 2ª linha, crua e quebra</span>
              </div>
              <LossTypeCards
                metrics={summaryMetrics}
                selectedCategory={filters.perdaTipo}
                onSelectCategory={(cat: LossCategory) => handleFilterChange({ perdaTipo: cat })}
                scopeLabel={scopeLabel}
              />
              <LossByOvenChart
                ovens={ovenSummaries}
                selectedOven={filters.forno}
                onSelectOven={(oven) => handleFilterChange({ forno: oven })}
              />
            </div>

            {/* 4. Gráficos Diários: ProductionDailyChart + LossDailyChart */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#2e2d2a] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                  4. Gráficos Diários
                </span>
                <span className="text-xs text-[#9e988f]">· Produção útil e perdas no dia a dia</span>
              </div>
              <ProductionDailyChart
                data={dailySummaries}
                scopeLabel={scopeLabel}
              />
              <LossDailyChart
                data={dailySummaries}
                averageLossPct={summaryMetrics.perdaPct}
                scopeLabel={scopeLabel}
              />
            </div>
          </div>
        ) : (
          /* Modo Normal: Renderiza apenas a aba ativa (renderização condicional leve) */
          <div className="space-y-6">
            {/* Aba 1: "Visão Geral": OvenTable + AnomalyTable */}
            {activeTab === 'visao-geral' && (
              <>
                <OvenTable
                  ovens={ovenSummaries}
                  selectedOven={filters.forno}
                  onSelectOven={(oven) => handleFilterChange({ forno: oven })}
                />
                <AnomalyTable
                  records={filteredRecords}
                  scopeLabel={scopeLabel}
                  perdaTipo={filters.perdaTipo}
                  onSelectChamber={(chamber) => setSelectedChamber(chamber)}
                  alertThresholds={alertThresholds}
                  onOpenAlertSettings={() => setIsAlertModalOpen(true)}
                />
              </>
            )}

            {/* Aba 2: "Comparativo Mensal": MonthlyComparison */}
            {activeTab === 'comparativo' && (
              <MonthlyComparison records={records} activeMonthKey={filters.selectedMonth} />
            )}

            {/* Aba 3: "Perdas por Tipo": LossTypeCards + LossByOvenChart */}
            {activeTab === 'perdas' && (
              <>
                <LossTypeCards
                  metrics={summaryMetrics}
                  selectedCategory={filters.perdaTipo}
                  onSelectCategory={(cat: LossCategory) => handleFilterChange({ perdaTipo: cat })}
                  scopeLabel={scopeLabel}
                />
                <LossByOvenChart
                  ovens={ovenSummaries}
                  selectedOven={filters.forno}
                  onSelectOven={(oven) => handleFilterChange({ forno: oven })}
                />
              </>
            )}

            {/* Aba 4: "Gráficos Diários": ProductionDailyChart + LossDailyChart */}
            {activeTab === 'graficos' && (
              <>
                <ProductionDailyChart
                  data={dailySummaries}
                  scopeLabel={scopeLabel}
                />
                <LossDailyChart
                  data={dailySummaries}
                  averageLossPct={summaryMetrics.perdaPct}
                  scopeLabel={scopeLabel}
                />
              </>
            )}
          </div>
        )}
      </main>

      {/* Floating Exit Button for Presentation Mode on TV/Monitors */}
      {isPresentationMode && (
        <button
          type="button"
          onClick={handleTogglePresentation}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1c1b19]/90 hover:bg-[#282724] text-[#f4efe6] border border-[#ea580c]/50 shadow-2xl backdrop-blur-md transition-all cursor-pointer group hover:scale-105"
          title="Sair do Modo Apresentação (Pressione ESC)"
        >
          <Minimize2 className="w-4 h-4 text-[#ea580c] group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold">Sair da Apresentação</span>
          <span className="text-[10px] text-[#8c867e] bg-[#2a2926] px-1.5 py-0.5 rounded font-mono">
            ESC
          </span>
        </button>
      )}

      {/* Modals */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <FinancialWasteModal
        isOpen={isFinancialModalOpen}
        onClose={() => setIsFinancialModalOpen(false)}
        metrics={summaryMetrics}
      />

      <NewRecordModal
        isOpen={isNewRecordModalOpen}
        onClose={() => setIsNewRecordModalOpen(false)}
        onAddRecord={handleAddManualRecord}
      />

      <ChamberDetailModal
        chamber={selectedChamber}
        onClose={() => setSelectedChamber(null)}
      />

      <ShareSyncModal
        isOpen={isShareSyncOpen}
        onClose={() => setIsShareSyncOpen(false)}
        datasetName={datasetName}
        totalChambers={records.length}
        lastUpdated={lastUpdated}
        onRefreshFromServer={() => fetchSharedRecords(true)}
        isSyncing={isSyncing}
        isAdmin={isAdmin}
        onOpenAdminAuth={() => setIsAdminAuthModalOpen(true)}
        hasBackup={hasBackup}
        onRestoreBackup={handleRequestRestoreBackup}
      />

      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        isAdmin={isAdmin}
        mustChangePin={mustChangePin}
        onLoginSuccess={(token) => {
          setIsAdmin(true);
          if (token) {
            setAdminToken(token);
            sessionStorage.setItem('telha_canal_admin_token', token);
          }
          setMustChangePin(false);
          setSuccessToast('Acesso de Administrador ativado! Abastecimento de planilhas liberado.');
          setTimeout(() => setSuccessToast(null), 4000);
        }}
        onLogoutAdmin={() => {
          setIsAdmin(false);
          setAdminToken('');
          sessionStorage.removeItem('telha_canal_admin_token');
          localStorage.removeItem('telha_canal_admin_token');
          setSuccessToast('Modo de Visualização para Equipe ativado.');
          setTimeout(() => setSuccessToast(null), 3000);
        }}
      />

      {/* Threshold Alerts Modal */}
      <ThresholdAlertsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        thresholds={alertThresholds}
        onSaveThresholds={handleSaveAlertThresholds}
        isAdmin={isAdmin}
        onOpenAdminAuth={() => setIsAdminAuthModalOpen(true)}
        records={filteredRecords}
      />

      {/* In-app Confirmation Modal (reliable inside iframes) */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.confirmVariant}
        icon={confirmDialog.icon}
      />
    </div>
  );
}
