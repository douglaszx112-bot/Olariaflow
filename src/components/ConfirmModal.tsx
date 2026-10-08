import React from 'react';
import { AlertTriangle, RotateCcw, Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  icon?: 'trash' | 'restore' | 'warning';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  icon = 'warning',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#1c1b19] border border-[#393733] shadow-2xl text-[#f4efe6]">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8c867e] hover:text-[#f4efe6] hover:bg-[#282724] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 mb-4">
          <div
            className={`p-3 rounded-xl border shrink-0 ${
              confirmVariant === 'danger'
                ? 'bg-[#ef4444]/15 border-[#ef4444]/30 text-[#ef4444]'
                : confirmVariant === 'warning'
                ? 'bg-[#f59e0b]/15 border-[#f59e0b]/30 text-[#f59e0b]'
                : 'bg-[#38bdf8]/15 border-[#38bdf8]/30 text-[#38bdf8]'
            }`}
          >
            {icon === 'trash' ? (
              <Trash2 className="w-5 h-5" />
            ) : icon === 'restore' ? (
              <RotateCcw className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-[#f4efe6]">{title}</h3>
            <p className="text-xs text-[#a8a29e] mt-1.5 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2e2d2a]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#282724] hover:bg-[#34332f] text-[#b0aba2] hover:text-[#f4efe6] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md ${
              confirmVariant === 'danger'
                ? 'bg-[#dc2626] hover:bg-[#b91c1c] text-white'
                : confirmVariant === 'warning'
                ? 'bg-[#d97706] hover:bg-[#b45309] text-white'
                : 'bg-[#0284c7] hover:bg-[#0369a1] text-white'
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
