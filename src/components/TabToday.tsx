import React, { useState } from 'react';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CreditCard as CardIcon, 
  Banknote, 
  Trash2, 
  TrendingUp, 
  Filter,
  CheckCircle2,
  History,
  ChevronRight,
  ChevronDown,
  ArrowRightLeft,
  Sparkles,
  AlertTriangle,
  Copy,
  Share2,
  Check
} from 'lucide-react';
import { Expense, CreditCard, Income, FixedExpense, CategoryId, PaymentMethod, Currency, InstallmentPurchase } from '../types/finance';
import { CategoryIcon, CategoryBadge } from './CategoryIcon';
import { formatMoney, formatCurrency, formatDateSpanish, formatPeriodSpanish } from '../utils/format';
import { triggerHaptic } from '../hooks/useFinanceStore';
import { IncomesHistoryModal } from './IncomesHistoryModal';
import { ExchangeUsdModal } from './ExchangeUsdModal';
import { MovementDetailModal } from './MovementDetailModal';

interface TabTodayProps {
  saldoNetoDisponible: number;
  totalGastadoEfectivoMes: number;
  totalPendienteDePago: number;
  totalIncome: number;
  disponibleUSD: number;
  usdInitialBalance?: number;
  suggestedDailyPace: number;
  daysRemaining: number;
  isViewingHistory?: boolean;
  selectedPeriod?: string;
  onReturnToCurrentPeriod?: () => void;
  expenses: Expense[];
  creditCards: CreditCard[];
  installmentPurchases?: InstallmentPurchase[];
  incomes: Income[];
  fixedExpenses?: FixedExpense[];
  currencySymbol: string;
  onOpenQuickExpense: () => void;
  onOpenQuickIncome: () => void;
  onAddExpense?: (payload: {
    amount: number;
    category: CategoryId;
    paymentMethod: PaymentMethod;
    creditCardId?: string;
    note?: string;
    currency?: Currency;
  }) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  onUpdateIncome: (id: string, payload: {
    amount: number;
    source: string;
    note?: string;
    date?: string;
  }) => void;
  onExchangeUsdToArs: (payload: {
    usdAmount: number;
    arsAmount: number;
    note?: string;
  }) => void;
  onSetUsdInitialBalance: (balance: number) => void;
}

export const TabToday: React.FC<TabTodayProps> = ({
  saldoNetoDisponible,
  totalGastadoEfectivoMes,
  totalPendienteDePago,
  totalIncome,
  disponibleUSD,
  usdInitialBalance = 0,
  suggestedDailyPace,
  daysRemaining,
  isViewingHistory = false,
  selectedPeriod,
  onReturnToCurrentPeriod,
  expenses,
  creditCards,
  installmentPurchases = [],
  incomes,
  fixedExpenses = [],
  currencySymbol,
  onOpenQuickExpense,
  onOpenQuickIncome,
  onAddExpense,
  onDeleteExpense,
  onDeleteIncome,
  onUpdateIncome,
  onExchangeUsdToArs,
  onSetUsdInitialBalance,
}) => {
  const [filter, setFilter] = useState<'all' | 'today' | 'cash' | 'credit'>('all');
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [showIncomesHistoryModal, setShowIncomesHistoryModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [copiedSummaryToast, setCopiedSummaryToast] = useState(false);
  const [selectedDetailExpense, setSelectedDetailExpense] = useState<Expense | null>(null);

  // Reset pagination when period or filter changes
  React.useEffect(() => {
    setVisibleCount(10);
  }, [selectedPeriod, filter]);

  const todayIso = new Date().toISOString().split('T')[0];

  const handleDuplicateExpense = (exp: Expense) => {
    triggerHaptic('success');
    if (onAddExpense) {
      onAddExpense({
        amount: exp.amount,
        category: exp.category,
        paymentMethod: exp.paymentMethod,
        creditCardId: exp.creditCardId,
        note: exp.note,
        currency: exp.currency,
      });
      setDuplicateNotice(`¡Gasto duplicado hoy!`);
      setTimeout(() => setDuplicateNotice(null), 2500);
    }
  };

  const handleCopyMonthlySummary = async () => {
    triggerHaptic('success');
    const formattedMonth = formatPeriodSpanish(selectedPeriod || new Date().toISOString().slice(0, 7));

    const paidFixed = fixedExpenses
      .filter(f => f.isPaid && (f.currency || 'ARS') === 'ARS' && f.paymentMethod !== 'credit_card')
      .reduce((a, b) => a + b.amount, 0);
    const totalFixed = fixedExpenses
      .filter(f => (f.currency || 'ARS') === 'ARS' && f.paymentMethod !== 'credit_card')
      .reduce((a, b) => a + b.amount, 0);

    const cardDebtPending = creditCards.reduce(
      (acc, c) => acc + Math.max(0, c.statementBalance - c.amountPaid),
      0
    );

    const spentToday = expenses
      .filter(e => e.date === todayIso && (e.currency || 'ARS') === 'ARS')
      .reduce((a, b) => a + b.amount, 0);

    const summaryText = [
      `📊 Resumen Financiero - ${formattedMonth}`,
      `• Disponible Neto: ${formatMoney(saldoNetoDisponible, currencySymbol, false)}${disponibleUSD > 0 ? ` (Caja USD: ${formatCurrency(disponibleUSD, 'USD', false)})` : ''}`,
      `• Ingresos Totales: ${formatMoney(totalIncome, currencySymbol, false)}`,
      `• Gastos Fijos (Pagados/Total): ${formatMoney(paidFixed, currencySymbol, false)} / ${formatMoney(totalFixed, currencySymbol, false)}`,
      `• Tarjetas a Pagar: ${formatMoney(cardDebtPending, currencySymbol, false)}`,
      `• Gastado en el Día: ${formatMoney(spentToday, currencySymbol, false)}`
    ].join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = summaryText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedSummaryToast(true);
      setTimeout(() => setCopiedSummaryToast(false), 3000);
    } catch (e) {
      console.error('Error al copiar resumen:', e);
    }
  };

  // Card map for fast lookup
  const cardMap = React.useMemo(() => {
    const map: Record<string, CreditCard> = {};
    creditCards.forEach(c => { map[c.id] = c; });
    return map;
  }, [creditCards]);

  // Filtered expenses
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(exp => {
      if (filter === 'today') return exp.date === todayIso;
      if (filter === 'cash') return exp.paymentMethod === 'cash_debit';
      if (filter === 'credit') return exp.paymentMethod === 'credit_card';
      return true;
    });
  }, [expenses, filter, todayIso]);

  // Income commitment percentage
  const spentPercent = totalIncome > 0 
    ? Math.min(100, Math.round(((totalGastadoEfectivoMes + totalPendienteDePago) / totalIncome) * 100))
    : 0;

  return (
    <div className="space-y-4 pb-24">
      {/* Historical Mode Notice Banner */}
      {isViewingHistory && selectedPeriod && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 shadow-lg shadow-black/20 animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-amber-200 block truncate">
                Viendo histórico: {formatPeriodSpanish(selectedPeriod)}
              </span>
              <p className="text-[10px] text-amber-300/80">
                Modo consulta / lectura
              </p>
            </div>
          </div>
          {onReturnToCurrentPeriod && (
            <button
              type="button"
              onClick={onReturnToCurrentPeriod}
              className="ios-active px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex-shrink-0 shadow-sm transition"
            >
              Volver al mes actual
            </button>
          )}
        </div>
      )}

      {/* Central Hero Card: Clean, high legible numbers */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-white/10 p-5 shadow-2xl shadow-black/40">
        {/* Subtle decorative glow */}
        <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none ${
          saldoNetoDisponible >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
        }`} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              saldoNetoDisponible >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
            }`} />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Disponible / Saldo Neto
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowIncomesHistoryModal(true);
              }}
              className="ios-active inline-flex flex-row items-center justify-center gap-1 whitespace-nowrap px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition shrink-0"
              title="Ver detalle e historial de ingresos del mes"
            >
              <History size={13} className="text-emerald-400 shrink-0" />
              <span>Detalle</span>
            </button>
            <button
              type="button"
              onClick={onOpenQuickIncome}
              className="ios-active inline-flex flex-row items-center justify-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full border border-emerald-500/20 transition shrink-0"
            >
              <TrendingUp size={13} className="shrink-0" />
              <span>+ Ingreso</span>
            </button>
          </div>
        </div>

        {/* Main Big Number */}
        <div className="mt-2">
          <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums ${
            saldoNetoDisponible >= 0 ? 'text-white' : 'text-rose-400'
          }`}>
            {formatMoney(saldoNetoDisponible, currencySymbol)}
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Dinero real disponible en mano/banco para lo que queda del mes
          </p>

          {/* Widget de Ritmo Sugerido / Gasto Diario */}
          <div className="mt-3">
            {saldoNetoDisponible > 0 ? (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl sm:rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 shadow-sm flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Sparkles size={13} className="text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap">
                    Ritmo sugerido: <strong className="text-white tabular-nums">{formatMoney(suggestedDailyPace, currencySymbol)}</strong> / día
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400/80 font-normal whitespace-nowrap shrink-0">
                  ({daysRemaining} {daysRemaining === 1 ? 'día restante' : 'días restantes'})
                </span>
              </div>
            ) : totalIncome === 0 ? (
              <button
                type="button"
                onClick={onOpenQuickIncome}
                className="ios-active inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-sm hover:bg-emerald-500/25 transition"
              >
                <TrendingUp size={12} className="text-emerald-400 shrink-0" />
                <span className="whitespace-nowrap">Cargar primer ingreso del mes &rarr;</span>
              </button>
            ) : (
              <div className="inline-flex flex-row items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-sm">
                <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                <span className="whitespace-nowrap">Presupuesto excedido</span>
              </div>
            )}
          </div>
        </div>

        {/* Two Key Sub-Metrics */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
          <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wider text-[10px]">
              <ArrowDownRight size={14} className="text-amber-400" />
              <span>Gastado este mes</span>
            </div>
            <p className="text-lg font-extrabold text-slate-200 mt-1 tabular-nums tracking-tight">
              {formatMoney(totalGastadoEfectivoMes, currencySymbol)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Efectivo, débito y fijos pagos</p>
          </div>

          <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wider text-[10px]">
              <Clock size={14} className="text-indigo-400" />
              <span>Pendiente de pago</span>
            </div>
            <p className="text-lg font-extrabold text-slate-200 mt-1 tabular-nums tracking-tight">
              {formatMoney(totalPendienteDePago, currencySymbol)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Fijos por vencer + tarjetas</p>
          </div>
        </div>

        {/* Income commitment bar if income exists (clickable to manage incomes) */}
        {totalIncome > 0 && (
          <div 
            onClick={() => {
              triggerHaptic('light');
              setShowIncomesHistoryModal(true);
            }}
            className="mt-4 pt-2 cursor-pointer group active:opacity-80 transition"
            title="Toca para ver el detalle de ingresos"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span className="group-hover:text-emerald-300 transition flex items-center gap-1 font-medium">
                <span>Ingresos totales: <strong className="text-white tabular-nums">{formatMoney(totalIncome, currencySymbol)}</strong></span>
                <ChevronRight size={13} className="text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
              </span>
              <span className={spentPercent > 85 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                {spentPercent}% comprometido
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  spentPercent > 90 ? 'bg-rose-500' : spentPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(spentPercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* TARJETA DISPONIBLE EN USD (SOLUCIÓN DEFINITIVA A PRUEBA DE SUPERPOSICIONES) */}
        <div className="mt-3.5 w-full bg-[#131b26] border border-amber-500/25 rounded-2xl p-3 flex items-center justify-between gap-2">
          {/* Lado izquierdo: Ícono + Saldo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <span className="text-amber-400 font-bold text-xs">US$</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold text-amber-500/90 uppercase tracking-wider leading-none whitespace-nowrap">
                DISPONIBLE EN USD
              </span>
              <span id="saldo-usd-display" className="text-lg font-black text-white mt-1 leading-none">
                {formatCurrency(disponibleUSD, 'USD')}
              </span>
            </div>
          </div>

          {/* Lado derecho: Botón compacto optimizado para móvil */}
          <button 
            onClick={() => {
              triggerHaptic('light');
              setShowExchangeModal(true);
            }} 
            type="button" 
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 flex items-center gap-1.5 shadow-sm transition whitespace-nowrap"
          >
            <span className="text-sm font-black">⇄</span>
            <span>Cambiar</span>
          </button>
        </div>
      </div>

      {/* Main Ultra Fast 1-Tap Trigger Button */}
      <button
        onClick={() => {
          triggerHaptic('medium');
          onOpenQuickExpense();
        }}
        className="ios-active w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:brightness-110 transition"
      >
        <div className="w-6 h-6 rounded-full bg-slate-950 text-emerald-400 flex items-center justify-center">
          <Plus size={16} className="stroke-[3]" />
        </div>
        <span>Anotar Gastos en 3 Segundos</span>
      </button>

      {/* Recent Movements Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 whitespace-nowrap shrink-0">
            <span>Últimos Movimientos</span>
            <span className="text-xs font-normal text-slate-400">
              ({filteredExpenses.length})
            </span>
          </h3>

          {/* Quick filter pills in horizontal scrollable container */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 bg-slate-900/80 p-1 rounded-xl border border-white/5 max-w-full">
            <button
              onClick={() => { triggerHaptic('light'); setFilter('all'); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition shrink-0 ${
                filter === 'all' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { triggerHaptic('light'); setFilter('today'); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition shrink-0 ${
                filter === 'today' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => { triggerHaptic('light'); setFilter('cash'); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition shrink-0 ${
                filter === 'cash' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Efectivo
            </button>
            <button
              onClick={() => { triggerHaptic('light'); setFilter('credit'); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition shrink-0 ${
                filter === 'credit' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tarjeta
            </button>
          </div>
        </div>

        {/* Movement items */}
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-white/5 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {filter === 'all' ? 'Sin movimientos aún' : 'No hay gastos en esta vista'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                {filter === 'all' 
                  ? 'Presiona + para cargar tu primer ingreso o gasto en menos de 5 segundos.' 
                  : 'Cambia el filtro o presiona el botón + para registrar un nuevo gasto.'}
              </p>
            </div>
            {filter === 'all' && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onOpenQuickExpense}
                  className="ios-active inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-950 transition"
                >
                  <Plus size={14} className="stroke-[3]" />
                  <span>Cargar primer gasto</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExpenses.slice(0, visibleCount).map((exp) => {
              const isCredit = exp.paymentMethod === 'credit_card';
              const card = exp.creditCardId ? cardMap[exp.creditCardId] : null;
              const isUSD = exp.currency === 'USD';

              return (
                <div
                  key={exp.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedDetailExpense(exp);
                  }}
                  className="ios-active group flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 border border-white/5 hover:border-white/10 hover:bg-slate-900/90 active:scale-[0.99] transition shadow-sm cursor-pointer"
                  title="Ver detalle completo del movimiento"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-slate-700/80 transition">
                      <CategoryIcon categoryId={exp.category} size={18} className="text-slate-200 shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CategoryBadge categoryId={exp.category} />
                        {isUSD && (
                          <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-500/30 whitespace-nowrap shrink-0">
                            USD
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {formatDateSpanish(exp.date)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium truncate mt-0.5 max-w-full">
                        {exp.note || (isCredit ? 'Consumo con tarjeta' : isUSD ? 'Gasto en dólares (USD)' : 'Gasto en efectivo / débito')}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isCredit ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 font-medium truncate max-w-full">
                            <CardIcon size={10} className="shrink-0" />
                            <span className="truncate">{card ? `${card.name} (*${card.lastDigits})` : 'Tarjeta Crédito'}</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium truncate max-w-full ${isUSD ? 'text-amber-400' : 'text-emerald-400'}`}>
                            <Banknote size={10} className="shrink-0" />
                            <span className="truncate">{isUSD ? 'Caja USD' : 'Efectivo / Débito'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3 shrink-0 text-right">
                    <div>
                      <p className={`text-sm font-bold tracking-tight whitespace-nowrap ${isUSD ? 'text-amber-300' : 'text-white'}`}>
                        -{formatCurrency(exp.amount, exp.currency || 'ARS')}
                      </p>
                    </div>

                    {onAddExpense && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateExpense(exp);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition shrink-0"
                        title="Repetir / duplicar gasto hoy"
                      >
                        <Copy size={15} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteExpense(exp.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                      title="Eliminar gasto"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Load More Button or End of List Indicator */}
            {visibleCount < filteredExpenses.length ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setVisibleCount(prev => prev + 10);
                  }}
                  className="ios-active w-full py-2.5 px-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <ChevronDown size={15} className="text-emerald-400" />
                  <span>Cargar más movimientos (+{Math.min(10, filteredExpenses.length - visibleCount)})</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({Math.min(visibleCount, filteredExpenses.length)} de {filteredExpenses.length})
                  </span>
                </button>
              </div>
            ) : filteredExpenses.length > 10 ? (
              <p className="text-center text-[11px] text-slate-400 pt-2 pb-1 font-medium">
                Has llegado al final de los movimientos ({filteredExpenses.length})
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Botón Compartir / Copiar Resumen del Mes */}
      <div className="pt-3 pb-6 flex flex-col items-center">
        <button
          type="button"
          onClick={handleCopyMonthlySummary}
          className="ios-active w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
        >
          {copiedSummaryToast ? (
            <>
              <Check size={16} className="text-emerald-400" />
              <span className="text-emerald-400 font-bold">¡Resumen copiado al portapapeles!</span>
            </>
          ) : (
            <>
              <Share2 size={15} className="text-indigo-400" />
              <span>Copiar Resumen del Mes</span>
            </>
          )}
        </button>

        {/* Notificación flotante de gasto duplicado */}
        {duplicateNotice && (
          <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-fade-in shadow-lg">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{duplicateNotice}</span>
          </div>
        )}
      </div>

      {/* Incomes History & Management Modal */}
      <IncomesHistoryModal
        isOpen={showIncomesHistoryModal}
        onClose={() => setShowIncomesHistoryModal(false)}
        incomes={incomes}
        currencySymbol={currencySymbol}
        onDeleteIncome={onDeleteIncome}
        onUpdateIncome={onUpdateIncome}
        onOpenAddIncome={() => {
          setShowIncomesHistoryModal(false);
          onOpenQuickIncome();
        }}
      />

      {/* Quick USD Exchange Modal */}
      <ExchangeUsdModal
        isOpen={showExchangeModal}
        onClose={() => setShowExchangeModal(false)}
        disponibleUSD={disponibleUSD}
        usdInitialBalance={usdInitialBalance}
        onExchangeUsdToArs={onExchangeUsdToArs}
        onSetUsdInitialBalance={onSetUsdInitialBalance}
      />

      {/* Movement Detail Modal */}
      <MovementDetailModal
        expense={selectedDetailExpense}
        onClose={() => setSelectedDetailExpense(null)}
        creditCards={creditCards}
        installmentPurchases={installmentPurchases}
        currencySymbol={currencySymbol}
      />
    </div>
  );
};
