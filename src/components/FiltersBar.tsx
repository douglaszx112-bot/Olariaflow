import React from 'react';
import { FilterState, LossCategory, MonthOption } from '../types';
import { RotateCcw, Upload, Plus, Calendar, Search, Lock, Layers, Trash2 } from 'lucide-react';
import { formatDateBR } from '../utils/calculations';

interface FiltersBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  availableDates: string[];
  totalChambersCount: number;
  filteredChambersCount: number;
  datasetName: string;
  lastUpdated?: string;
  onOpenImport: () => void;
  onOpenNewRecord: () => void;
  onRestoreBackup?: () => void;
  onResetData: () => void;
  hasBackup?: boolean;
  minDate: string;
  maxDate: string;
  isAdmin: boolean;
  onOpenAdminAuth: () => void;
  availableMonths?: MonthOption[];
  onSelectMonth?: (monthKey: string) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filters,
  onFilterChange,
  availableDates,
  totalChambersCount,
  filteredChambersCount,
  datasetName,
  lastUpdated,
  onOpenImport,
  onOpenNewRecord,
  onRestoreBackup,
  onResetData,
  hasBackup = false,
  minDate,
  maxDate,
  isAdmin,
  onOpenAdminAuth,
  availableMonths = [],
  onSelectMonth,
}) => {
  const fornos = ['all', 'Forno 1', 'Forno 2', 'Forno 3', 'Forno 4', 'Forno 5'];

  const perdaOptions: Array<{ id: LossCategory; label: string; dotColor?: string }> = [
    { id: 'all', label: 'Todas' },
    { id: '2a', label: '2ª', dotColor: 'bg-[#eab308]' },
    { id: 'crua', label: 'Crua', dotColor: 'bg-[#60a5fa]' },
    { id: 'trinca', label: 'Trinca', dotColor: 'bg-[#f87171]' },
    { id: 'quebra', label: 'Quebra', dotColor: 'bg-[#b45309]' },
  ];

  const handleResetPeriod = () => {
    onFilterChange({
      startDate: minDate,
      endDate: maxDate,
    });
  };

  const isFullPeriod = filters.startDate === minDate && filters.endDate === maxDate;

  return (
    <div className="space-y-3 mb-6 no-print">
      {/* Primary Filter Control Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#1c1b19] border border-[#2e2d2a] shadow-sm">
        {/* Month Navigator / Flutuação por Mês */}
        {availableMonths.length > 0 && (
          <div className="mb-4 pb-3.5 border-b border-[#2e2d2a]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8c867e] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>Flutuar por Mês (Mês de Referência)</span>
              </div>
              {availableMonths.length > 1 && (
                <span className="text-[11px] text-[#38bdf8] font-medium hidden sm:inline">
                  {availableMonths.length} meses disponíveis no histórico (dados isolados)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => onSelectMonth?.('all')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                  filters.selectedMonth === 'all'
                    ? 'bg-[#c85a2b] text-white shadow-sm ring-1 ring-[#c85a2b]'
                    : 'bg-[#272623] text-[#b0aba2] hover:bg-[#34332f] hover:text-[#f4efe6] border border-[#33312e]'
                }`}
              >
                Todos os Meses (Consolidado)
              </button>

              {availableMonths.map((m) => {
                const isActive = filters.selectedMonth === m.monthKey;
                return (
                  <button
                    key={m.monthKey}
                    type="button"
                    onClick={() => onSelectMonth?.(m.monthKey)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#c85a2b] text-white shadow-sm ring-1 ring-[#c85a2b]'
                        : 'bg-[#272623] text-[#b0aba2] hover:bg-[#34332f] hover:text-[#f4efe6] border border-[#33312e]'
                    }`}
                  >
                    <span>{m.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                        isActive ? 'bg-black/30 text-white' : 'bg-[#1c1b19] text-[#8c867e]'
                      }`}
                    >
                      {m.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Forno Filter */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8c867e] mb-2">
            Forno
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {fornos.map((f) => {
              const isActive = filters.forno === f;
              const label = f === 'all' ? 'Todos os fornos' : f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => onFilterChange({ forno: f })}
                  className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#c85a2b] text-white shadow-sm ring-1 ring-[#c85a2b]'
                      : 'bg-[#272623] text-[#b0aba2] hover:bg-[#34332f] hover:text-[#f4efe6] border border-[#33312e]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Perda Filter */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8c867e] mb-2">
            Perda
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {perdaOptions.map((opt) => {
              const isActive = filters.perdaTipo === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onFilterChange({ perdaTipo: opt.id })}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#c85a2b] text-white shadow-sm ring-1 ring-[#c85a2b]'
                      : 'bg-[#272623] text-[#b0aba2] hover:bg-[#34332f] hover:text-[#f4efe6] border border-[#33312e]'
                  }`}
                >
                  {opt.dotColor && (
                    <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} />
                  )}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#2a2926]">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#b0aba2]">
            <Calendar className="w-4 h-4 text-[#8c867e]" />
            <span>De</span>
            <select
              value={filters.startDate}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              className="bg-[#272623] border border-[#393733] text-[#f4efe6] rounded-lg px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#c85a2b]"
            >
              {availableDates.length > 0 ? (
                availableDates.map((d) => (
                  <option key={d} value={d}>
                    {formatDateBR(d)}
                  </option>
                ))
              ) : (
                <option value="">Aguardando planilha</option>
              )}
            </select>

            <span>até</span>
            <select
              value={filters.endDate}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
              className="bg-[#272623] border border-[#393733] text-[#f4efe6] rounded-lg px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#c85a2b]"
            >
              {availableDates.length > 0 ? (
                availableDates.map((d) => (
                  <option key={d} value={d}>
                    {formatDateBR(d)}
                  </option>
                ))
              ) : (
                <option value="">Aguardando planilha</option>
              )}
            </select>
          </div>

          {availableDates.length > 0 && (
            <button
              type="button"
              onClick={handleResetPeriod}
              className={`text-xs font-medium underline underline-offset-4 transition-colors ${
                isFullPeriod ? 'text-[#8c867e] hover:text-[#c85a2b]' : 'text-[#ea580c] hover:text-[#fb923c]'
              }`}
            >
              período completo
            </button>
          )}

          {/* Quick Search */}
          <div className="ml-auto w-full sm:w-auto relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8c867e]" />
            <input
              type="text"
              placeholder="Buscar câmara ou data..."
              value={filters.searchTerm}
              onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#242320] border border-[#33312e] text-[#f4efe6] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c85a2b] placeholder-[#6b665f]"
            />
          </div>
        </div>
      </div>

      {/* Dataset & Quick Upload Actions Banner (matching Screenshot 5) */}
      <div className="p-4 rounded-2xl bg-[#1c1b19] border border-[#2e2d2a] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="text-xs sm:text-sm font-semibold text-[#f4efe6] flex flex-wrap items-center gap-2">
            <span>Base atual:</span>
            <span className="font-normal text-[#b0aba2]">
              {totalChambersCount} câmaras ({filteredChambersCount} no filtro) ·{' '}
              {formatDateBR(minDate)} a {formatDateBR(maxDate)}
            </span>
            {datasetName !== 'planilha original' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30">
                Planilha personalizada ativa
              </span>
            )}
          </div>
          <div className="text-xs text-[#8c867e] mt-0.5 flex flex-wrap items-center gap-1.5">
            <span>{datasetName}</span>
            {lastUpdated && (
              <>
                <span>·</span>
                <span className="text-[#a8a29e]">Última atualização: {lastUpdated}</span>
              </>
            )}
          </div>
        </div>

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenNewRecord}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#f4efe6] border border-[#393733] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Lançar câmara</span>
            </button>

            <button
              type="button"
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#c85a2b] hover:bg-[#b84f23] text-white shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>+ Adicionar base (.xlsx)</span>
            </button>

            {hasBackup && onRestoreBackup && (
              <button
                type="button"
                onClick={onRestoreBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#38bdf8] hover:text-[#7dd3fc] border border-[#38bdf8]/40 hover:border-[#38bdf8] transition-colors cursor-pointer"
                title="Restaurar a última cópia de backup do servidor"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Backup</span>
              </button>
            )}

            <button
              type="button"
              onClick={onResetData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#282724] hover:bg-[#3a2020] text-[#a8a29e] hover:text-[#f87171] border border-[#393733] hover:border-[#ef4444]/40 transition-colors cursor-pointer"
              title="Zerar a base de dados do painel"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Zerar base</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAdminAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[#242320] hover:bg-[#2e2d2a] border border-[#33312e] hover:border-[#ea580c]/50 text-[#8c867e] hover:text-[#f4efe6] transition-colors cursor-pointer"
            title="Clique para autenticar como Administrador com senha"
          >
            <Lock className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Modo de Leitura (Clique para entrar como Administrador)</span>
          </button>
        )}
      </div>
    </div>
  );
};
