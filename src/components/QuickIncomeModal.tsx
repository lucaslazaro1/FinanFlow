import React, { useState, useEffect, useRef } from 'react';
import { X, Check, TrendingUp, PlusCircle } from 'lucide-react';
import { triggerHaptic } from '../hooks/useFinanceStore';
import { Currency } from '../types/finance';
import { filterNumericInput, handleNumericKeyDown } from '../utils/format';

interface QuickIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIncome: (payload: {
    amount: number;
    source: string;
    note?: string;
    currency?: Currency;
  }) => void;
  currencySymbol: string;
}

const COMMON_SOURCES = [
  'Sueldo Principal',
  'Honorarios Freelance',
  'Alquiler cobrado',
  'Venta / Comisiones',
  'Inversiones / Dividendos',
  'Otro Ingreso',
];

export const QuickIncomeModal: React.FC<QuickIncomeModalProps> = ({
  isOpen,
  onClose,
  onAddIncome,
  currencySymbol,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [source, setSource] = useState<string>('Sueldo Principal');
  const [customSource, setCustomSource] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setCurrency('ARS');
      setNote('');
      setIsCustom(false);
      setCustomSource('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedAmount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      inputRef.current?.focus();
      return;
    }

    const finalSource = isCustom ? (customSource.trim() || 'Ingreso') : source;

    onAddIncome({
      amount: parsedAmount,
      source: finalSource,
      note: note.trim() || undefined,
      currency,
    });

    onClose();
  };

  const parsedAmount = parseFloat(amountStr) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        <div className="px-5 pt-2 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
              <TrendingUp size={16} />
            </div>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
              Cargar Ingreso del Mes
            </span>
          </div>
          <button
            onClick={onClose}
            className="ios-active p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Currency Selector [ ARS (Pesos) | USD (Dólares) ] */}
        <div className="flex justify-center px-5 pt-1 pb-1">
          <div className="flex p-0.5 rounded-xl bg-slate-950/80 border border-white/10 w-full max-w-xs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setCurrency('ARS');
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                currency === 'ARS' 
                  ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ARS (Pesos)
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setCurrency('USD');
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                currency === 'USD' 
                  ? 'bg-amber-400 text-slate-950 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD (Dólares)
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="px-5 py-3 text-center">
          <label className="text-[11px] font-medium text-slate-400 block mb-1">
            {currency === 'USD' ? 'Monto del Ingreso en Dólares (USD)' : 'Monto del Ingreso'}
          </label>
          <div className="relative inline-flex items-center justify-center w-full">
            <span className={`text-3xl sm:text-4xl font-light mr-2 ${currency === 'USD' ? 'text-amber-400 font-bold text-2xl sm:text-3xl' : 'text-slate-400'}`}>
              {currency === 'USD' ? 'US$' : currencySymbol}
            </span>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amountStr}
              onChange={(e) => {
                const val = filterNumericInput(e.target.value);
                setAmountStr(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                  return;
                }
                handleNumericKeyDown(e);
              }}
              className="w-48 sm:w-64 text-4xl sm:text-5xl font-extrabold tracking-tight text-white bg-transparent text-left focus:outline-none placeholder:text-slate-700"
              autoFocus
            />
          </div>

          {currency === 'USD' && (
            <p className="text-[11px] text-amber-300/80 mt-1 font-medium">
              Suma exclusivamente a tu <strong>Caja / Disponible en USD</strong>
            </p>
          )}
        </div>

        {/* Source preset chips */}
        <div className="px-5 py-2 flex-1 overflow-y-auto no-scrollbar">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Origen / Concepto
          </label>
          <div className="grid grid-cols-2 gap-2">
            {COMMON_SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSource(s);
                  setIsCustom(false);
                }}
                className={`ios-active p-2.5 rounded-xl border text-xs font-medium text-left transition ${
                  !isCustom && source === s
                    ? 'border-emerald-500 bg-emerald-500/20 text-white'
                    : 'border-white/5 bg-slate-950/40 text-slate-300 hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsCustom(!isCustom);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <span>{isCustom ? 'Volver a lista rápida' : '+ Escribir otro concepto personalizado'}</span>
            </button>
            {isCustom && (
              <input
                type="text"
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                placeholder="Ej: Cobro de deuda, Aguinaldo, etc."
                className="w-full mt-2 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-950/90 border-t border-white/5 mt-auto">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={parsedAmount <= 0}
            className={`ios-active w-full py-3.5 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition ${
              parsedAmount > 0
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Check size={18} className="stroke-[3]" />
            <span>Sumar a Ingresos del Mes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
