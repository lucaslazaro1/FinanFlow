import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  Check, 
  DollarSign, 
  TrendingUp, 
  Sparkles,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { formatCurrency, formatMoney, filterNumericInput, handleNumericKeyDown } from '../utils/format';
import { triggerHaptic } from '../hooks/useFinanceStore';

interface ExchangeUsdModalProps {
  isOpen: boolean;
  onClose: () => void;
  disponibleUSD: number;
  usdInitialBalance: number;
  onExchangeUsdToArs: (payload: {
    usdAmount: number;
    arsAmount: number;
    note?: string;
  }) => void;
  onSetUsdInitialBalance: (balance: number) => void;
}

export const ExchangeUsdModal: React.FC<ExchangeUsdModalProps> = ({
  isOpen,
  onClose,
  disponibleUSD,
  usdInitialBalance,
  onExchangeUsdToArs,
  onSetUsdInitialBalance,
}) => {
  const [usdAmountStr, setUsdAmountStr] = useState<string>('');
  const [arsAmountStr, setArsAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isAdjustMode, setIsAdjustMode] = useState<boolean>(false);
  const [newInitialBalanceStr, setNewInitialBalanceStr] = useState<string>('');
  const usdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUsdAmountStr('');
      setArsAmountStr('');
      setNote('');
      setIsAdjustMode(false);
      setNewInitialBalanceStr(String(usdInitialBalance || ''));
      setTimeout(() => {
        usdInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, usdInitialBalance]);

  if (!isOpen) return null;

  const parsedUsd = parseFloat(usdAmountStr.replace(/[^0-9.]/g, '')) || 0;
  const parsedArs = parseFloat(arsAmountStr.replace(/[^0-9.]/g, '')) || 0;
  const impliedRate = parsedUsd > 0 && parsedArs > 0 ? parsedArs / parsedUsd : 0;

  const handleSubmitExchange = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedUsd <= 0 || parsedArs <= 0) return;

    onExchangeUsdToArs({
      usdAmount: parsedUsd,
      arsAmount: parsedArs,
      note: note.trim() || undefined,
    });

    onClose();
  };

  const handleSaveAdjustBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newInitialBalanceStr.replace(/[^0-9.]/g, ''));
    if (isNaN(val) || val < 0) return;

    onSetUsdInitialBalance(val);
    setIsAdjustMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Drag Handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {isAdjustMode ? 'Ajustar Caja en USD' : 'Cambiar / Vender USD a Pesos'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAdjustMode 
                  ? 'Establece tu saldo inicial de dólares en mano' 
                  : 'Descuenta USD y suma ARS a tus ingresos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsAdjustMode(!isAdjustMode);
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition text-xs flex items-center gap-1"
              title={isAdjustMode ? 'Volver a cambiar' : 'Ajustar caja base'}
            >
              <SlidersHorizontal size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Current USD Status Banner */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-400 font-medium">Disponible actual en USD:</span>
            </div>
            <span className="text-sm font-extrabold text-emerald-300 tabular-nums">
              {formatCurrency(disponibleUSD, 'USD')}
            </span>
          </div>

          {isAdjustMode ? (
            /* Mode 2: Adjust base USD balance */
            <form onSubmit={handleSaveAdjustBalance} className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
                <Info size={16} className="flex-shrink-0 mt-0.5" />
                <p>
                  Si tienes dólares en efectivo o ahorros previos que no provienen de un ingreso cargado este mes, puedes definir aquí tu saldo base en USD.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Saldo base / reserva inicial en USD (US$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none select-none">
                    US$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newInitialBalanceStr}
                    onChange={(e) => setNewInitialBalanceStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-14 pr-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustMode(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-md shadow-emerald-500/20"
                >
                  Guardar Saldo USD
                </button>
              </div>
            </form>
          ) : (
            /* Mode 1: Exchange USD to ARS */
            <form onSubmit={handleSubmitExchange} className="space-y-4">
              {/* Field 1: Dólares a vender (USD) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Dólares a vender (USD)
                  </label>
                  {disponibleUSD > 0 && (
                    <button
                      type="button"
                      onClick={() => setUsdAmountStr(String(disponibleUSD))}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-medium"
                    >
                      Vender todo ({formatCurrency(disponibleUSD, 'USD')})
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-sm pointer-events-none select-none">
                    US$
                  </span>
                  <input
                    ref={usdInputRef}
                    type="text"
                    inputMode="decimal"
                    required
                    value={usdAmountStr}
                    onChange={(e) => setUsdAmountStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    placeholder="100"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-14 pr-4 py-3 text-lg font-extrabold text-amber-300 focus:outline-none focus:border-amber-500 tabular-nums"
                  />
                </div>
              </div>

              {/* Conversion indicator arrow */}
              <div className="flex justify-center -my-1">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 shadow-sm">
                  <ArrowRightLeft size={14} className="rotate-90 sm:rotate-0" />
                </div>
              </div>

              {/* Field 2: Pesos recibidos (ARS) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Pesos recibidos (ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm pointer-events-none select-none">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={arsAmountStr}
                    onChange={(e) => setArsAmountStr(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    placeholder="130.000"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-9 pr-4 py-3 text-lg font-extrabold text-emerald-400 focus:outline-none focus:border-emerald-500 tabular-nums"
                  />
                </div>
              </div>

              {/* Exchange rate display pill */}
              {impliedRate > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-amber-400/90">
                    Tipo de cambio implícito:
                  </span>
                  <span className="font-extrabold tabular-nums">
                    $ {new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(impliedRate)} / USD
                  </span>
                </div>
              )}

              {/* Optional Note */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Nota / Referencia (opcional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Cambio en cueva / Buenbit / Dólar MEP"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Summary of actions */}
              <div className="text-[11px] text-slate-400 bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-400 flex-shrink-0" />
                  <span>Resta <strong className="text-white">{formatCurrency(parsedUsd, 'USD')}</strong> de la caja en USD.</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-400 flex-shrink-0" />
                  <span>Suma <strong className="text-white">{formatMoney(parsedArs, '$')}</strong> a Ingresos en Pesos (ARS).</span>
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={parsedUsd <= 0 || parsedArs <= 0}
                className="ios-active w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-extrabold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 transition"
              >
                <Check size={16} className="stroke-[3]" />
                <span>Confirmar Cambio a Pesos</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
