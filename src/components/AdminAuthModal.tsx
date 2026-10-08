import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLoginSuccess: (token?: string) => void;
  onLogoutAdmin: () => void;
  mustChangePin?: boolean;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onLoginSuccess,
  onLogoutAdmin,
  mustChangePin = false,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Change PIN sub-form
  const [isChangingPin, setIsChangingPin] = useState(mustChangePin && isAdmin);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setErrorMsg('Digite a senha de administrador.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.token);
        setSuccessMsg('Modo Administrador liberado com sucesso!');
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Senha incorreta. Tente novamente.');
      }
    } catch {
      setErrorMsg('Erro de comunicação com o servidor. Verifique a conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPinInput.trim()) {
      setErrorMsg('Digite a senha atual de administrador.');
      return;
    }

    // Item 2: Minimum 6 characters required
    if (!newPinInput.trim() || newPinInput.trim().length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres para garantir a segurança da fábrica.');
      return;
    }

    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setErrorMsg('A confirmação da nova senha não coincide.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const token = sessionStorage.getItem('telha_canal_admin_token') || localStorage.getItem('telha_canal_admin_token');
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-admin-token': token } : {}),
        },
        body: JSON.stringify({
          currentPin: currentPinInput.trim(),
          newPin: newPinInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.token);
        setSuccessMsg('Senha de administrador alterada e protegida com sucesso!');
        setIsChangingPin(false);
        setCurrentPinInput('');
        setNewPinInput('');
        setConfirmPinInput('');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || 'Não foi possível alterar a senha.');
      }
    } catch {
      setErrorMsg('Erro de conexão ao alterar a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md p-5 sm:p-6 rounded-2xl bg-[#1c1b19] border border-[#393733] shadow-2xl text-[#f4efe6]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2e2d2a] mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isAdmin
                  ? 'bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/30'
                  : 'bg-[#ea580c]/15 text-[#ea580c] border-[#ea580c]/30'
              }`}
            >
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#f4efe6]">
                {isAdmin ? 'Painel do Administrador' : 'Acesso do Administrador'}
              </h3>
              <p className="text-xs text-[#9e988f]">
                {isAdmin
                  ? 'Permissões completas de abastecimento ativas'
                  : 'Proteção contra alterações no link compartilhado'}
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

        {/* Warning if using default password */}
        {mustChangePin && isAdmin && !isChangingPin && (
          <div className="mb-4 p-3 rounded-xl bg-[#eab308]/15 border border-[#eab308]/30 text-xs text-[#fde047] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Aviso de Segurança:</div>
              <div>Sua instalação está usando a senha padrão. Recomendamos alterá-la para uma senha forte de 6 dígitos.</div>
            </div>
          </div>
        )}

        {/* Success message */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/30 text-xs text-[#4ade80] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/30 text-xs text-[#f87171] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* NOT LOGGED IN: Simple PIN Prompt */}
        {!isAdmin ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#ded8ce] mb-1.5">
                Digite a Senha de Administrador (PIN):
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Digite sua senha..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-[#121110] border border-[#33312e] rounded-xl text-sm font-mono text-[#f4efe6] focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c867e] hover:text-[#f4efe6]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#8c867e] mt-1.5">
                Digite a senha de administrador configurada pelo responsável do sistema.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#272623] hover:bg-[#33312c] text-[#b0aba2] hover:text-[#f4efe6] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#c85a2b] hover:bg-[#b84f23] text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Verificando...' : 'Entrar como Administrador'}
              </button>
            </div>
          </form>
        ) : (
          /* ALREADY LOGGED IN: Change PIN or Logout */
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[#171614] border border-[#2e2d2a] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#8c867e]">Status de Permissão:</span>
                <span className="text-[#4ade80] font-bold">Total (Abastecimento Liberado)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8c867e]">Proteção:</span>
                <span className="text-[#b0aba2]">Hash com Salt (PBKDF2)</span>
              </div>
            </div>

            {/* Change PIN Accordion / Sub-form */}
            {isChangingPin ? (
              <form onSubmit={handleChangePin} className="p-4 rounded-xl bg-[#242320] border border-[#383632] space-y-3">
                <div className="text-xs font-bold text-[#f4efe6] mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#fb923c]" />
                  <span>Cadastrar Nova Senha Segura (Mínimo 6 caracteres)</span>
                </div>

                <div>
                  <label className="block text-[11px] text-[#8c867e] mb-1">
                    Senha Atual:
                  </label>
                  <input
                    type="password"
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    placeholder="Digite a senha atual..."
                    className="w-full px-3 py-1.5 bg-[#171614] border border-[#33312e] rounded-lg text-xs text-[#f4efe6] focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#8c867e] mb-1">
                    Nova Senha (mín. 6 caracteres):
                  </label>
                  <input
                    type="password"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="Nova senha com 6+ caracteres..."
                    className="w-full px-3 py-1.5 bg-[#171614] border border-[#33312e] rounded-lg text-xs text-[#f4efe6] focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#8c867e] mb-1">
                    Confirmar Nova Senha:
                  </label>
                  <input
                    type="password"
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="Repita a nova senha..."
                    className="w-full px-3 py-1.5 bg-[#171614] border border-[#33312e] rounded-lg text-xs text-[#f4efe6] focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPin(false);
                      setErrorMsg(null);
                    }}
                    className="px-3 py-1.5 text-xs text-[#8c867e] hover:text-[#f4efe6]"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#c85a2b] hover:bg-[#b84f23] text-white shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangingPin(true)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#ded8ce] border border-[#383632] transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-[#fb923c]" />
                  <span>Trocar Senha de Administrador (Mínimo 6 dígitos)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLogoutAdmin();
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-[#272623] hover:bg-[#ef4444]/20 hover:border-[#ef4444]/40 text-[#f87171] border border-[#33312e] transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair do Modo Administrador</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
