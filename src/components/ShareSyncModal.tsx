import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Users,
  Cloud,
  RefreshCw,
  Lock,
  ShieldCheck,
  Eye,
  KeyRound,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { formatNumberBR } from '../utils/calculations';

interface ShareSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName: string;
  totalChambers: number;
  lastUpdated: string;
  onRefreshFromServer: () => Promise<void>;
  isSyncing: boolean;
  isAdmin: boolean;
  onOpenAdminAuth: () => void;
  onRestoreBackup?: () => Promise<void> | void;
  hasBackup?: boolean;
}

export const ShareSyncModal: React.FC<ShareSyncModalProps> = ({
  isOpen,
  onClose,
  datasetName,
  totalChambers,
  lastUpdated,
  onRefreshFromServer,
  isSyncing,
  isAdmin,
  onOpenAdminAuth,
  onRestoreBackup,
  hasBackup = false,
}) => {
  const [copiedTeam, setCopiedTeam] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  if (!isOpen) return null;

  // Use active origin without leaking any credentials in the URL
  const activeOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-dev-swuidboqebwiioz5vjwqam-869559838902.us-east1.run.app';

  // Item 1: Link for Team (View-Only, completely free of any passwords or secret keys)
  const teamShareUrl = `${activeOrigin}/?mode=view`;

  const handleCopyTeamLink = () => {
    navigator.clipboard.writeText(teamShareUrl);
    setCopiedTeam(true);
    setTimeout(() => setCopiedTeam(false), 3000);
  };

  const handleRestoreBackupClick = async () => {
    if (!onRestoreBackup) return;
    setIsRestoring(true);
    try {
      await onRestoreBackup();
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl p-5 sm:p-6 rounded-2xl bg-[#1c1b19] border border-[#393733] shadow-2xl text-[#f4efe6]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2e2d2a] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#f4efe6]">
                Compartilhamento & Segurança dos Dados
              </h3>
              <p className="text-xs text-[#9e988f]">
                Controle de acesso em rede com proteção contra alterações não autorizadas
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

        {/* Protection Banner Notice */}
        <div className="p-4 rounded-xl bg-[#242320] border border-[#2e2d2a] mb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4ade80]">
            <Lock className="w-4 h-4" />
            <span>Acesso Seguro (Somente Leitura para a Equipe):</span>
          </div>
          <p className="text-xs text-[#ded8ce] leading-relaxed">
            O link de compartilhamento para sua equipe é configurado como <strong className="text-[#f4efe6]">Somente Leitura</strong>.
            Diretores, encarregados e equipe visualizam os gráficos e KPIs atualizados em tempo real,
            mas <strong>não possuem permissão para apagar ou abastecer planilhas</strong>.
          </p>
        </div>

        {/* Current Shared Status */}
        <div className="p-3.5 rounded-xl bg-[#171614] border border-[#2a2926] space-y-2 mb-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#8c867e]">Status do Servidor:</span>
            <span className="flex items-center gap-1.5 text-[#4ade80] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
              Conectado & Sincronizado na Nuvem
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8c867e]">Base Ativa Compartilhada:</span>
            <span className="font-semibold text-[#f4efe6] truncate max-w-[240px]">
              {datasetName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8c867e]">Volume de Câmaras:</span>
            <span className="font-mono font-bold text-[#38bdf8]">
              {formatNumberBR(totalChambers)} câmaras
            </span>
          </div>
          {lastUpdated && (
            <div className="flex items-center justify-between">
              <span className="text-[#8c867e]">Última Atualização:</span>
              <span className="font-mono text-[#ded8ce]">{lastUpdated}</span>
            </div>
          )}
        </div>

        {/* 1. TEAM LINK (PROTECTED / READ-ONLY) */}
        <div className="mb-4 p-3.5 rounded-xl bg-[#242320] border border-[#383632]">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-[#f4efe6] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Link para a Equipe (Sem Permissão de Upload):</span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
              Somente Leitura
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={teamShareUrl}
              className="flex-1 bg-[#121110] border border-[#33312e] rounded-xl px-3 py-2 text-xs font-mono text-[#b0aba2] select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyTeamLink}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#c85a2b] hover:bg-[#b84f23] text-white shadow-sm transition-all shrink-0 cursor-pointer"
            >
              {copiedTeam ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copiedTeam ? 'Copiado!' : 'Copiar Link da Equipe'}</span>
            </button>
          </div>
          {/* Item 6: Confidentiality note */}
          <p className="text-[11px] text-[#8c867e] mt-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-[#eab308] shrink-0" />
            <span>Dados de produção internos da cerâmica. Compartilhe exclusivamente com pessoas autorizadas da equipe.</span>
          </p>
        </div>

        {/* 2. ADMIN AUTHENTICATION MANAGEMENT (Item 1: Never exposes password in URL) */}
        <div className="mb-5 p-3.5 rounded-xl bg-[#242320] border border-[#ea580c]/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#ea580c]" />
              <span className="text-xs font-bold text-[#f4efe6]">
                Autenticação de Administrador
              </span>
            </div>
            {isAdmin ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30">
                Sessão Ativa
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30">
                Não Autenticado
              </span>
            )}
          </div>
          <p className="text-xs text-[#a8a29e] mb-3 leading-relaxed">
            Por segurança, a senha de administrador <strong>nunca é transmitida na URL</strong>. Para realizar abastecimentos de planilhas ou gerenciar os dados, faça login seguro com seu PIN.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdminAuth();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#fb923c] border border-[#ea580c]/40 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Gerenciar / Trocar Senha' : 'Fazer Login de Administrador'}</span>
            </button>

            {/* Item 5: Restore Backup Option */}
            {isAdmin && hasBackup && onRestoreBackup && (
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleRestoreBackupClick}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#38bdf8] border border-[#38bdf8]/30 transition-colors cursor-pointer disabled:opacity-50"
                title="Restaura a base anterior salva em cópia de segurança antes do último upload ou reset"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'Restaurando...' : 'Restaurar Cópia de Backup'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-[#2e2d2a] flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isSyncing}
            onClick={onRefreshFromServer}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#ded8ce] border border-[#383632] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#38bdf8] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Verificar Atualizações'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#272623] hover:bg-[#33312c] text-[#b0aba2] hover:text-[#f4efe6] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
