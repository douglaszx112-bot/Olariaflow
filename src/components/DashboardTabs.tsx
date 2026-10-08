import React from 'react';
import { LayoutDashboard, CalendarRange, Flame, BarChart3 } from 'lucide-react';
import { DashboardTab } from '../types';

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  ovensCount?: number;
  anomaliesCount?: number;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
  activeTab,
  onChangeTab,
  ovensCount,
  anomaliesCount,
}) => {
  const tabs = [
    {
      id: 'visao-geral' as DashboardTab,
      label: 'Visão Geral',
      shortLabel: 'Geral',
      description: 'Fornos e Câmaras',
      icon: LayoutDashboard,
      badge: ovensCount ? `${ovensCount} fornos` : undefined,
    },
    {
      id: 'comparativo' as DashboardTab,
      label: 'Comparativo Mensal',
      shortLabel: 'Comparativo',
      description: 'Evolução e Metas',
      icon: CalendarRange,
    },
    {
      id: 'perdas' as DashboardTab,
      label: 'Perdas por Tipo',
      shortLabel: 'Perdas',
      description: 'Causas e Defeitos',
      icon: Flame,
      badgeColor: 'text-[#f87171]',
    },
    {
      id: 'graficos' as DashboardTab,
      label: 'Gráficos Diários',
      shortLabel: 'Gráficos',
      description: 'Tendência Dia a Dia',
      icon: BarChart3,
    },
  ];

  return (
    <nav
      aria-label="Abas do Painel"
      className="mb-6 p-1.5 rounded-2xl bg-[#1c1b19] border border-[#2e2d2a] shadow-xs no-print"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex items-center justify-center sm:justify-start gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-left ${
                isActive
                  ? 'bg-[#272623] text-[#f4efe6] shadow-xs border border-[#393733]'
                  : 'text-[#9e988f] hover:text-[#ded8ce] hover:bg-[#22211e] border border-transparent'
              }`}
            >
              {/* Active Indicator Bar on bottom */}
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#ea580c] rounded-full shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
              )}

              <div
                className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#ea580c]/15 text-[#ea580c]'
                    : 'bg-[#242320] text-[#78736b]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                  </span>
                  {tab.badge && (
                    <span className="hidden md:inline-block px-1.5 py-0.2 text-[10px] font-mono rounded bg-[#151413] text-[#b0aba2] border border-[#2e2d2a]">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <div className="hidden sm:block text-[10px] text-[#78736b] truncate mt-0.5 font-medium">
                  {tab.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
