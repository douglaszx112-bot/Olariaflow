import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { ChamberRecord } from '../types';

interface NewRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecord: (record: ChamberRecord) => void;
}

export const NewRecordModal: React.FC<NewRecordModalProps> = ({
  isOpen,
  onClose,
  onAddRecord,
}) => {
  const [data, setData] = useState<string>('2026-09-23');
  const [forno, setForno] = useState<string>('Forno 1');
  const [camara, setCamara] = useState<string>('1');
  const [enforna, setEnforna] = useState<number>(15600);
  const [perda2Grau, setPerda2Grau] = useState<number>(250);
  const [perdaCrua, setPerdaCrua] = useState<number>(180);
  const [perdaTrinca, setPerdaTrinca] = useState<number>(320);
  const [perdaQuebra, setPerdaQuebra] = useState<number>(80);

  if (!isOpen) return null;

  const totalPerdas = perda2Grau + perdaCrua + perdaTrinca + perdaQuebra;
  const desenfornaCalculada = Math.max(0, enforna - totalPerdas);
  const perdaPct = enforna > 0 ? (totalPerdas / enforna) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: ChamberRecord = {
      id: `manual-${Date.now()}`,
      data,
      forno,
      camara: parseInt(camara, 10) || camara,
      enforna,
      desenforna: desenfornaCalculada,
      perda_2grau: perda2Grau,
      perda_crua: perdaCrua,
      perda_trinca: perdaTrinca,
      perda_quebra: perdaQuebra,
    };
    onAddRecord(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#1c1b19] border border-[#393733] shadow-2xl text-[#f4efe6]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2e2d2a] mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#ea580c]/15 text-[#ea580c]">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Lançar Registro de Queima</h3>
              <p className="text-xs text-[#9e988f]">Adicionar dados de uma câmara manualmente</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#8c867e] hover:text-[#f4efe6] hover:bg-[#282724] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#8c867e] uppercase mb-1">
                Data
              </label>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#242320] border border-[#33312e] rounded-xl text-[#f4efe6] focus:outline-none focus:ring-1 focus:ring-[#c85a2b]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8c867e] uppercase mb-1">
                Forno
              </label>
              <select
                value={forno}
                onChange={(e) => setForno(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#242320] border border-[#33312e] rounded-xl text-[#f4efe6] focus:outline-none focus:ring-1 focus:ring-[#c85a2b]"
              >
                {['Forno 1', 'Forno 2', 'Forno 3', 'Forno 4', 'Forno 5'].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#8c867e] uppercase mb-1">
                Nº Câmara
              </label>
              <input
                type="text"
                required
                value={camara}
                onChange={(e) => setCamara(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#242320] border border-[#33312e] rounded-xl text-[#f4efe6] focus:outline-none focus:ring-1 focus:ring-[#c85a2b]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8c867e] uppercase mb-1">
                Enforna (peças)
              </label>
              <input
                type="number"
                min="1"
                required
                value={enforna}
                onChange={(e) => setEnforna(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-xs font-mono bg-[#242320] border border-[#33312e] rounded-xl text-[#f4efe6] focus:outline-none focus:ring-1 focus:ring-[#c85a2b]"
              />
            </div>
          </div>

          {/* Perdas */}
          <div className="pt-2 border-t border-[#2e2d2a]">
            <label className="block text-[11px] font-semibold text-[#8c867e] uppercase mb-2">
              Defeitos / Perdas (peças)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-[#eab308]">2ª Linha:</span>
                <input
                  type="number"
                  min="0"
                  value={perda2Grau}
                  onChange={(e) => setPerda2Grau(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-[#242320] border border-[#33312e] rounded-xl text-[#f4efe6]"
                />
              </div>

              <div>
                <span className="text-[11px] text-[#60a5fa]">Crua:</span>
                <input
                  type="number"
                  min="0"
                  value={perdaCrua}
                  onChange={(e) => setPerdaCrua(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-[#242320] border border-[#33312e] rounded-xl text-[#f4efe6]"
                />
              </div>

              <div>
                <span className="text-[11px] text-[#f87171]">Trinca:</span>
                <input
                  type="number"
                  min="0"
                  value={perdaTrinca}
                  onChange={(e) => setPerdaTrinca(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-[#242320] border border-[#33312e] rounded-xl text-[#f4efe6]"
                />
              </div>

              <div>
                <span className="text-[11px] text-[#b45309]">Quebra:</span>
                <input
                  type="number"
                  min="0"
                  value={perdaQuebra}
                  onChange={(e) => setPerdaQuebra(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-[#242320] border border-[#33312e] rounded-xl text-[#f4efe6]"
                />
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-3 rounded-xl bg-[#242320] border border-[#33312e] text-xs flex justify-between items-center">
            <div>
              <span className="text-[#8c867e]">Desenforna útil:</span>{' '}
              <strong className="text-[#f4efe6] font-mono">{desenfornaCalculada.toLocaleString('pt-BR')}</strong>
            </div>
            <div>
              <span className="text-[#8c867e]">Taxa de perda:</span>{' '}
              <strong className="text-[#f87171] font-mono">{perdaPct.toFixed(1)}%</strong>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#8c867e] hover:text-[#f4efe6] rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#c85a2b] hover:bg-[#b84f23] text-white shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Registro</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
