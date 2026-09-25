import React, { useState } from 'react';
import { 
  Check, 
  RotateCcw, 
  Plus, 
  Trash2, 
  CheckCircle2,
  X,
  CreditCard as CardIcon,
  Banknote,
  Edit3,
  Calendar,
  CalendarPlus,
  Layers
} from 'lucide-react';
import { FixedExpense, CategoryId, CATEGORIES, Currency, CreditCard, PaymentMethod } from '../types/finance';
import { CategoryIcon } from './CategoryIcon';
import { formatMoney, formatCurrency, getTrafficLightStatus, filterNumericInput, handleNumericKeyDown } from '../utils/format';
import { downloadDueCalendarEvent } from '../utils/calendar';
import { triggerHaptic } from '../hooks/useFinanceStore';

interface TabFixedExpensesProps {
  fixedExpenses: FixedExpense[];
  creditCards: CreditCard[];
  currencySymbol: string;
  onToggleFixedExpense: (id: string) => void;
  onAddFixedExpense: (payload: {
    title: string;
    amount: number;
    dueDay: number;
    category: CategoryId;
    currency?: Currency;
    paymentMethod?: PaymentMethod;
    creditCardId?: string;
  }) => void;
  onUpdateFixedExpense: (id: string, payload: {
    title: string;
    amount: number;
    dueDay: number;
    category: CategoryId;
    currency?: Currency;
    paymentMethod?: PaymentMethod;
    creditCardId?: string;
  }) => void;
  onDeleteFixedExpense: (id: string) => void;
  onResetNewMonth: () => void;
}

export const TabFixedExpenses: React.FC<TabFixedExpensesProps> = ({
  fixedExpenses,
  creditCards,
  currencySymbol,
  onToggleFixedExpense,
  onAddFixedExpense,
  onUpdateFixedExpense,
  onDeleteFixedExpense,
  onResetNewMonth,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // New fixed form state
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDay, setNewDueDay] = useState('10');
  const [newCategory, setNewCategory] = useState<CategoryId>('servicios');
  const [newCurrency, setNewCurrency] = useState<Currency>('ARS');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>('cash_debit');
  const [newCreditCardId, setNewCreditCardId] = useState<string>(creditCards[0]?.id || '');

  // Edit fixed form state
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDay, setEditDueDay] = useState('10');
  const [editCategory, setEditCategory] = useState<CategoryId>('servicios');
  const [editCurrency, setEditCurrency] = useState<Currency>('ARS');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('cash_debit');
  const [editCreditCardId, setEditCreditCardId] = useState<string>('');

  // Card lookup map
  const cardMap = React.useMemo(() => {
    const map: Record<string, CreditCard> = {};
    creditCards.forEach(c => { map[c.id] = c; });
    return map;
  }, [creditCards]);

  // Computed metrics (solo efectivo/transferencia en ARS para no duplicar con tarjetas)
  const cashFixedExpenses = fixedExpenses.filter(f => (f.currency || 'ARS') === 'ARS' && f.paymentMethod !== 'credit_card');
  const totalAmount = cashFixedExpenses.reduce((acc, f) => acc + f.amount, 0);
  const paidAmount = cashFixedExpenses.filter(f => f.isPaid).reduce((acc, f) => acc + f.amount, 0);
  const pendingAmount = cashFixedExpenses.filter(f => !f.isPaid).reduce((acc, f) => acc + f.amount, 0);

  // Auto-debit fixed items on credit cards
  const autoDebitItems = fixedExpenses.filter(f => f.paymentMethod === 'credit_card');

  // Cash/transfer pending items sorted by days remaining
  const pendingCashItems = fixedExpenses
    .filter(f => f.paymentMethod !== 'credit_card' && !f.isPaid)
    .sort((a, b) => {
      const statusA = getTrafficLightStatus(a.dueDay);
      const statusB = getTrafficLightStatus(b.dueDay);
      return statusA.daysLeft - statusB.daysLeft;
    });

  // Cash/transfer paid items
  const paidCashItems = fixedExpenses.filter(f => f.paymentMethod !== 'credit_card' && f.isPaid);

  const handleCreateFixed = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newAmount.replace(/[^0-9.]/g, ''));
    const dueDayVal = parseInt(newDueDay, 10);
    if (!newTitle.trim() || isNaN(amountVal) || amountVal <= 0 || isNaN(dueDayVal)) return;

    onAddFixedExpense({
      title: newTitle.trim(),
      amount: amountVal,
      dueDay: Math.min(31, Math.max(1, dueDayVal)),
      category: newCategory,
      currency: newCurrency,
      paymentMethod: newPaymentMethod,
      creditCardId: newPaymentMethod === 'credit_card' ? (newCreditCardId || creditCards[0]?.id) : undefined,
    });

    setNewTitle('');
    setNewAmount('');
    setNewDueDay('10');
    setNewCurrency('ARS');
    setNewPaymentMethod('cash_debit');
    setShowAddModal(false);
  };

  const handleStartEdit = (item: FixedExpense) => {
    triggerHaptic('light');
    setEditingFixedId(item.id);
    setEditTitle(item.title);
    setEditAmount(String(item.amount));
    setEditDueDay(String(item.dueDay));
    setEditCategory(item.category);
    setEditCurrency(item.currency || 'ARS');
    setEditPaymentMethod(item.paymentMethod || 'cash_debit');
    setEditCreditCardId(item.creditCardId || creditCards[0]?.id || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFixedId) return;
    const amountVal = parseFloat(editAmount.replace(/[^0-9.]/g, ''));
    const dueDayVal = parseInt(editDueDay, 10);
    if (!editTitle.trim() || isNaN(amountVal) || amountVal <= 0 || isNaN(dueDayVal)) return;

    onUpdateFixedExpense(editingFixedId, {
      title: editTitle.trim(),
      amount: amountVal,
      dueDay: Math.min(31, Math.max(1, dueDayVal)),
      category: editCategory,
      currency: editCurrency,
      paymentMethod: editPaymentMethod,
      creditCardId: editPaymentMethod === 'credit_card' ? (editCreditCardId || creditCards[0]?.id) : undefined,
    });

    setEditingFixedId(null);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Fijos & Servicios
          </h2>
          <p className="text-xs text-slate-400">
            Control de vencimientos y débitos automáticos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition shrink-0"
            title="Reiniciar todos a Pendientes para el nuevo mes"
          >
            <RotateCcw size={13} className="text-indigo-400 shrink-0" />
            <span>Nuevo Mes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              if (creditCards.length > 0 && !newCreditCardId) {
                setNewCreditCardId(creditCards[0].id);
              }
              setShowAddModal(true);
            }}
            className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold transition hover:bg-emerald-400 shrink-0"
          >
            <Plus size={14} className="stroke-[3] shrink-0" />
            <span>Agregar</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Bar for Cash/Transfer */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-3 rounded-2xl border border-white/5 shadow-sm">
        <div className="text-center border-r border-white/5">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Fijos Efectivo</span>
          <p className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">
            {formatMoney(totalAmount, currencySymbol)}
          </p>
        </div>
        <div className="text-center border-r border-white/5">
          <span className="text-[10px] uppercase font-semibold text-emerald-400">Ya Pagados</span>
          <p className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5 truncate">
            {formatMoney(paidAmount, currencySymbol)}
          </p>
        </div>
        <div className="text-center">
          <span className="text-[10px] uppercase font-semibold text-amber-400">Por Pagar</span>
          <p className="text-xs sm:text-sm font-bold text-amber-400 mt-0.5 truncate">
            {formatMoney(pendingAmount, currencySymbol)}
          </p>
        </div>
      </div>

      {/* Auto-Debit Info Pill if there are auto-debit services */}
      {autoDebitItems.length > 0 && (
        <div className="px-3.5 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between text-xs text-indigo-300">
          <div className="flex items-center gap-2">
            <CardIcon size={14} className="text-indigo-400 flex-shrink-0" />
            <span className="text-[11px] font-medium">
              <strong>{autoDebitItems.length} {autoDebitItems.length === 1 ? 'servicio' : 'servicios'}</strong> en Débito Automático (acumulan en Tarjetas)
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/80 bg-indigo-500/20 px-2 py-0.5 rounded-md">
            Sin Duplicación
          </span>
        </div>
      )}

      {fixedExpenses.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-white/5 space-y-3 mt-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <Calendar size={28} />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">Sin servicios ni gastos fijos</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Registra tus compromisos mensuales (alquiler, luz, expensas, internet) para agendarlos en tu calendario y tener previsibilidad de tu disponible real.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="ios-active inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950 transition"
            >
              <Plus size={15} />
              <span>Agregar Primer Servicio</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* SECTION 1: Servicios con Débito Automático en Tarjeta */}
          {autoDebitItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <CardIcon size={13} />
                  <span>Débito Automático en Tarjeta ({autoDebitItems.length})</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Se pagan con el resumen
                </span>
              </div>

          <div className="space-y-2">
            {autoDebitItems.map((item) => {
              const card = item.creditCardId ? cardMap[item.creditCardId] : null;
              const isUSD = item.currency === 'USD';

              return (
                <div
                  key={item.id}
                  className="ios-active flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-indigo-500/20 hover:border-indigo-500/40 transition shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <CardIcon size={16} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white truncate">
                          {item.title}
                        </p>
                        {isUSD && (
                          <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-md border border-amber-500/30">
                            USD
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          <span>{card ? `${card.name} (*${card.lastDigits})` : 'Tarjeta de Crédito'}</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Vence día {item.dueDay}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadDueCalendarEvent({
                            title: item.title,
                            dueDay: item.dueDay,
                            amount: item.amount,
                            currency: item.currency || 'ARS'
                          })}
                          className="ios-active inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition border border-white/5"
                          title="Agendar vencimiento en calendario nativo (.ics)"
                        >
                          <CalendarPlus size={11} className="text-emerald-400" />
                          <span>Agendar</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-2 flex-shrink-0 text-right">
                    <div>
                      <p className={`text-sm font-extrabold tracking-tight ${isUSD ? 'text-amber-300' : 'text-white'}`}>
                        {formatCurrency(item.amount, item.currency || 'ARS')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                      title="Editar gasto fijo"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteFixedExpense(item.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Eliminar gasto fijo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Servicios en Efectivo / Transferencia (Por Pagar) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 py-2.5 px-1">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5 min-w-0">
            <Banknote size={14} className="text-amber-400 shrink-0" />
            <span className="truncate">Efectivo / Transferencia por Pagar ({pendingCashItems.length})</span>
          </span>
          <span className="whitespace-nowrap font-bold text-sm text-amber-400 shrink-0 tabular-nums">
            {formatMoney(pendingAmount, currencySymbol)}
          </span>
        </div>

        {pendingCashItems.length === 0 ? (
          <div className="p-6 text-center bg-slate-900/50 rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 size={22} />
            </div>
            <p className="text-sm font-medium text-emerald-400">¡Al día! No hay fijos pendientes en efectivo</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Todos los fijos de caja están pagados este mes.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingCashItems.map((item) => {
              const due = getTrafficLightStatus(item.dueDay);
              const isUSD = item.currency === 'USD';

              let badgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
              let dotColor = 'bg-emerald-400';
              if (due.status === 'danger') {
                badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
                dotColor = 'bg-rose-400';
              } else if (due.status === 'warning') {
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                dotColor = 'bg-amber-400';
              }

              return (
                <div
                  key={item.id}
                  className="ios-active flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-white/5 hover:border-white/15 transition shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox para pagar de efectivo */}
                    <button
                      onClick={() => onToggleFixedExpense(item.id)}
                      className="w-6 h-6 rounded-lg border-2 border-slate-600 hover:border-emerald-500 flex items-center justify-center transition flex-shrink-0"
                      aria-label="Marcar como pagado"
                    >
                      {/* Empty */}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white truncate">
                          {item.title}
                        </p>
                      </div>
                      
                      {/* Semáforo visual en la fecha */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badgeColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          <span>{due.label}</span>
                        </span>
                        {isUSD && (
                          <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-md border border-amber-500/30">
                            USD
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          Día {item.dueDay}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadDueCalendarEvent({
                            title: item.title,
                            dueDay: item.dueDay,
                            amount: item.amount,
                            currency: item.currency || 'ARS'
                          })}
                          className="ios-active inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition border border-white/5"
                          title="Agendar vencimiento en calendario nativo (.ics)"
                        >
                          <CalendarPlus size={11} className="text-emerald-400" />
                          <span>Agendar</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-2 flex-shrink-0 text-right">
                    <div>
                      <p className={`text-sm font-bold ${isUSD ? 'text-amber-300' : 'text-slate-100'}`}>
                        {formatCurrency(item.amount, item.currency || 'ARS')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                      title="Editar gasto fijo"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      onClick={() => onDeleteFixedExpense(item.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Eliminar gasto fijo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: Paid Items in Cash/Transfer */}
      {paidCashItems.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Ya Pagados en Efectivo ({paidCashItems.length})</span>
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              {formatMoney(paidAmount, currencySymbol)}
            </span>
          </div>

          <div className="space-y-1.5">
            {paidCashItems.map((item) => (
              <div
                key={item.id}
                className="ios-active flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-white/5 opacity-70 hover:opacity-100 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Checked Checkbox */}
                  <button
                    onClick={() => onToggleFixedExpense(item.id)}
                    className="w-6 h-6 rounded-lg bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center transition flex-shrink-0 text-slate-950"
                    aria-label="Desmarcar como pagado"
                  >
                    <Check size={14} className="stroke-[3]" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-400 line-through truncate">
                        {item.title}
                      </p>
                      {item.currency === 'USD' && (
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30">
                          USD
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {item.paidAt ? `Pagado el ${item.paidAt}` : 'Pagado este mes'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <p className="text-xs font-medium text-slate-400 line-through">
                    {formatCurrency(item.amount, item.currency || 'ARS')}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="p-1 rounded-lg text-slate-500 hover:text-white transition"
                    title="Editar gasto fijo"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => onDeleteFixedExpense(item.id)}
                    className="p-1 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {/* Reset Month Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <RotateCcw size={20} />
            </div>
            <h3 className="text-base font-bold text-white">¿Comenzar Nuevo Mes?</h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Todos los gastos fijos en efectivo volverán al estado <strong>"Pendiente"</strong> para que puedas volver a tildarlos a medida que venzan en el nuevo mes.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="ios-active px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onResetNewMonth();
                  setShowResetConfirm(false);
                }}
                className="ios-active px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-900/30"
              >
                Sí, Reiniciar Pendientes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Nuevo Gasto Fijo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)} />

          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 pb-safe z-10 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white">Nuevo Gasto Fijo o Servicio</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFixed} className="space-y-3.5 mt-3">
              {/* 1. Selector de Medio de Pago */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Medio de Pago
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setNewPaymentMethod('cash_debit');
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                      newPaymentMethod === 'cash_debit'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Banknote size={14} />
                      <span>Efectivo / Transferencia</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">Resta al pagarse</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setNewPaymentMethod('credit_card');
                      if (creditCards.length > 0 && !newCreditCardId) {
                        setNewCreditCardId(creditCards[0].id);
                      }
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                      newPaymentMethod === 'credit_card'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CardIcon size={14} />
                      <span>Débito en Tarjeta</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">Suma al resumen</span>
                  </button>
                </div>
              </div>

              {/* Si es Débito en Tarjeta, selector de Tarjeta */}
              {newPaymentMethod === 'credit_card' && (
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                  <label className="text-[11px] font-semibold text-indigo-300 block">
                    Selecciona en qué tarjeta está adherido:
                  </label>
                  {creditCards.length === 0 ? (
                    <p className="text-xs text-rose-300">
                      No tienes tarjetas creadas. Crea una tarjeta en la pestaña "Tarjetas".
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {creditCards.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setNewCreditCardId(c.id);
                          }}
                          className={`p-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition text-left ${
                            newCreditCardId === c.id
                              ? 'border-indigo-400 bg-indigo-500/30 text-white shadow-sm'
                              : 'border-white/5 bg-slate-950/60 text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-indigo-400" />
                          <div className="truncate">
                            <span className="block truncate">{c.name}</span>
                            <span className="text-[10px] text-slate-400">*{c.lastDigits}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Selector de Moneda [ ARS (Pesos) | USD (Dólares) ] */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Moneda del servicio
                </label>
                <div className="flex p-0.5 rounded-xl bg-slate-950 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setNewCurrency('ARS');
                    }}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                      newCurrency === 'ARS'
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
                      setNewCurrency('USD');
                    }}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                      newCurrency === 'USD'
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    USD (Dólares)
                  </button>
                </div>
              </div>

              {/* 3. Nombre del servicio */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Nombre del servicio
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Netflix, Internet Fibra, Alquiler, Spotify..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              {/* 4. Monto y Día */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Monto estimado ({newCurrency === 'USD' ? 'US$' : currencySymbol})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0"
                    value={newAmount}
                    onChange={(e) => setNewAmount(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className={`w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none tabular-nums ${
                      newCurrency === 'USD' ? 'text-amber-400 focus:border-amber-500' : 'text-white focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Día vencimiento (1 - 31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={newDueDay}
                    onChange={(e) => setNewDueDay(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 5. Categoría */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Categoría
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as CategoryId)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="ios-active w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-emerald-500/20 mt-3"
              >
                Guardar Gasto Fijo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Gasto Fijo Existente */}
      {editingFixedId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setEditingFixedId(null)} />

          <div 
            className="relative w-full max-w-md bg-slate-900 border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl p-5 pb-safe z-10 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white">Editar Gasto Fijo</h3>
              <button
                onClick={() => setEditingFixedId(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 mt-3">
              {/* Selector de Medio de Pago */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Medio de Pago
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setEditPaymentMethod('cash_debit');
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                      editPaymentMethod === 'cash_debit'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Banknote size={14} />
                      <span>Efectivo / Transferencia</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">Resta al pagarse</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setEditPaymentMethod('credit_card');
                      if (creditCards.length > 0 && !editCreditCardId) {
                        setEditCreditCardId(creditCards[0].id);
                      }
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition ${
                      editPaymentMethod === 'credit_card'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CardIcon size={14} />
                      <span>Débito en Tarjeta</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">Suma al resumen</span>
                  </button>
                </div>
              </div>

              {/* Si es Débito en Tarjeta, selector de Tarjeta */}
              {editPaymentMethod === 'credit_card' && (
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                  <label className="text-[11px] font-semibold text-indigo-300 block">
                    Tarjeta adherida:
                  </label>
                  {creditCards.length === 0 ? (
                    <p className="text-xs text-rose-300">
                      No tienes tarjetas creadas.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {creditCards.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setEditCreditCardId(c.id);
                          }}
                          className={`p-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition text-left ${
                            editCreditCardId === c.id
                              ? 'border-indigo-400 bg-indigo-500/30 text-white shadow-sm'
                              : 'border-white/5 bg-slate-950/60 text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-indigo-400" />
                          <div className="truncate">
                            <span className="block truncate">{c.name}</span>
                            <span className="text-[10px] text-slate-400">*{c.lastDigits}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selector de Moneda */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Moneda del servicio
                </label>
                <div className="flex p-0.5 rounded-xl bg-slate-950 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setEditCurrency('ARS');
                    }}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
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
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                      editCurrency === 'USD'
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    USD (Dólares)
                  </button>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Nombre del servicio
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Monto y Día */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Monto ({editCurrency === 'USD' ? 'US$' : currencySymbol})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(filterNumericInput(e.target.value))}
                    onKeyDown={handleNumericKeyDown}
                    className={`w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none tabular-nums ${
                      editCurrency === 'USD' ? 'text-amber-400 focus:border-amber-500' : 'text-white focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Día vencimiento (1 - 31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={editDueDay}
                    onChange={(e) => setEditDueDay(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Categoría
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as CategoryId)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFixedId(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-md shadow-emerald-500/20"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
