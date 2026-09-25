import React, { useState } from 'react';
import { 
  X, 
  TrendingUp, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  Check, 
  FileText
} from 'lucide-react';
import { Income, Currency } from '../types/finance';
import { formatMoney, formatCurrency, formatDateSpanish, filterNumericInput, handleNumericKeyDown } from '../utils/format';
import { triggerHaptic } from '../hooks/useFinanceStore';

interface IncomesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomes: Income[];
  currencySymbol: string;
  onDeleteIncome: (id: string) => void;
  onUpdateIncome: (id: string, payload: {
    amount: number;
    source: string;
    note?: string;
    date?: string;
    currency?: Currency;
  }) => void;
  onOpenAddIncome: () => void;
}

export const IncomesHistoryModal: React.FC<IncomesHistoryModalProps> = ({
  isOpen,
  onClose,
  incomes,
  currencySymbol,
  onDeleteIncome,
  onUpdateIncome,
  onOpenAddIncome,
}) => {
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState('');
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCurrency, setEditCurrency] = useState<Currency>('ARS');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalIncomesARS = incomes
    .filter(inc => (inc.currency || 'ARS') === 'ARS')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalIncomesUSD = incomes
    .filter(inc => inc.currency === 'USD')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const handleStartEdit = (inc: Income) => {
    triggerHaptic('light');
    setEditingIncomeId(inc.id);
    setEditSource(inc.source);
    setEditAmountStr(String(inc.amount));
    setEditDate(inc.date);
    setEditNote(inc.note || '');
    setEditCurrency(inc.currency || 'ARS');
    setConfirmDeleteId(null);
  };

  const handleCancelEdit = () => {
    setEditingIncomeId(null);
  };

  const handleSaveEdit = (id: string) => {
    const amountVal = parseFloat(editAmountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(amountVal) || amountVal <= 0 || !editSource.trim()) return;

    triggerHaptic('success');
    onUpdateIncome(id, {
      source: editSource.trim(),
      amount: amountVal,
      date: editDate || new Date().toISOString().split('T')[0],
      note: editNote.trim(),
      currency: editCurrency,
    });
    setEditingIncomeId(null);
  };

  const handleDelete = (id: string) => {
    triggerHaptic('medium');
    onDeleteIncome(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[88vh] z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Historial de Ingresos
              </h3>
              <p className="text-xs text-slate-400">
                {incomes.length} {incomes.length === 1 ? 'registro' : 'registros'} • Total:{' '}
                <strong className="text-emerald-400 font-extrabold tabular-nums">
                  {formatCurrency(totalIncomesARS, 'ARS')}
                </strong>
                {totalIncomesUSD > 0 && (
                  <span className="text-amber-400 font-extrabold tabular-nums ml-1.5">
                    + {formatCurrency(totalIncomesUSD, 'USD')}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Incomes List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 min-h-0">
          {incomes.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileText size={28} className="opacity-60" />
              </div>
              <h4 className="text-sm font-bold text-white">No hay ingresos registrados</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-4">
                Carga tu sueldo, cobros o cualquier entrada de dinero para saber cuánto dinero real tienes disponible.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddIncome();
                }}
                className="ios-active px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Registrar Primer Ingreso</span>
              </button>
            </div>
          ) : (
            incomes.map((inc) => {
              const isEditing = editingIncomeId === inc.id;
              const isConfirmingDelete = confirmDeleteId === inc.id;

              if (isEditing) {
                return (
                  <div 
                    key={inc.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3 animate-fade-in"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-white/5">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                        Editar Ingreso
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {/* Currency Selector */}
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                          Moneda
                        </label>
                        <div className="flex p-0.5 rounded-xl bg-slate-900 border border-white/10">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setEditCurrency('ARS');
                            }}
                            className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                              editCurrency === 'ARS'
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
                              setEditCurrency('USD');
                            }}
                            className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                              editCurrency === 'USD'
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            USD (Dólares)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                          Concepto / Nombre
                        </label>
                        <input
                          type="text"
                          required
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value)}
                          placeholder="Ej: Sueldo, Venta, Aguinaldo"
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                            Monto ({editCurrency === 'USD' ? 'US$' : currencySymbol})
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            required
                            value={editAmountStr}
                            onChange={(e) => setEditAmountStr(filterNumericInput(e.target.value))}
                            onKeyDown={handleNumericKeyDown}
                            className={`w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-extrabold focus:outline-none tabular-nums ${
                              editCurrency === 'USD' ? 'text-amber-400 focus:border-amber-500' : 'text-emerald-400 focus:border-emerald-500'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                            Fecha
                          </label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                          Nota adicional (opcional)
                        </label>
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Detalle o referencia"
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Descartar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(inc.id)}
                        className="ios-active flex items-center gap-1 px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20"
                      >
                        <Check size={13} />
                        <span>Guardar Cambios</span>
                      </button>
                    </div>
                  </div>
                );
              }

              const isUSD = inc.currency === 'USD';

              return (
                <div 
                  key={inc.id}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 hover:border-white/10 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isUSD ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      <TrendingUp size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white tracking-tight truncate">
                          {inc.source}
                        </span>
                        {isUSD && (
                          <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-md border border-amber-500/30">
                            USD
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-sm font-extrabold tabular-nums tracking-tight ${isUSD ? 'text-amber-300' : 'text-emerald-400'}`}>
                          +{formatCurrency(inc.amount, inc.currency || 'ARS')}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <Calendar size={10} className="text-slate-500" />
                          {formatDateSpanish(inc.date)}
                        </span>
                      </div>
                      {inc.note && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 italic">
                          "{inc.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 animate-fade-in bg-rose-500/10 p-1 rounded-xl border border-rose-500/30">
                        <span className="text-[10px] text-rose-300 font-semibold px-1">¿Borrar?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(inc.id)}
                          className="px-2 py-1 bg-rose-500 text-white font-bold text-[10px] rounded-lg shadow-sm"
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-1 text-slate-300 hover:text-white text-[10px]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(inc)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                          title="Editar monto o concepto"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setConfirmDeleteId(inc.id);
                          }}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition"
                          title="Eliminar ingreso"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Add New Income Button */}
        <div className="p-4 border-t border-white/5 bg-slate-900/80 backdrop-blur-md flex-shrink-0 pb-safe">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAddIncome();
            }}
            className="ios-active w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
          >
            <Plus size={16} />
            <span>Cargar Nuevo Ingreso</span>
          </button>
        </div>
      </div>
    </div>
  );
};
