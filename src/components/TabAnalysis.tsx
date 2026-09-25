import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Sparkles, 
  PieChart, 
  ShieldAlert, 
  Lightbulb, 
  CalendarDays,
  Target,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  CheckCircle2,
  Zap,
  Info
} from 'lucide-react';
import { Expense, FixedExpense, CreditCard, CATEGORIES, CategoryId, FinanceData } from '../types/finance';
import { CategoryIcon } from './CategoryIcon';
import { formatMoney, formatPeriodSpanish } from '../utils/format';

interface TabAnalysisProps {
  expenses: Expense[];
  fixedExpenses: FixedExpense[];
  creditCards: CreditCard[];
  totalIncome: number;
  saldoNetoDisponible: number;
  totalGastadoEfectivoMes: number;
  totalPendienteDePago: number;
  currencySymbol: string;
  selectedPeriod?: string;
}

export const TabAnalysis: React.FC<TabAnalysisProps> = ({
  expenses,
  fixedExpenses,
  creditCards,
  totalIncome,
  saldoNetoDisponible,
  totalGastadoEfectivoMes,
  totalPendienteDePago,
  currencySymbol,
  selectedPeriod,
}) => {
  const currentPeriodKey = selectedPeriod || new Date().toISOString().slice(0, 7);

  // 1. Egresos del mes actual en ARS (Efectivo/Débito diarios + Fijos pagados + Resúmenes de tarjeta abonados)
  const currentCashDebitExpenses = expenses
    .filter(e => (e.currency || 'ARS') === 'ARS' && e.paymentMethod !== 'credit_card')
    .reduce((sum, e) => sum + e.amount, 0);

  const currentFixedPaid = fixedExpenses
    .filter(f => (f.currency || 'ARS') === 'ARS' && f.paymentMethod !== 'credit_card' && f.isPaid)
    .reduce((sum, f) => sum + f.amount, 0);

  const currentCardPaymentsPaid = creditCards
    .reduce((sum, c) => sum + (c.amountPaid || 0), 0);

  const currentTotalEgresos = currentCashDebitExpenses + currentFixedPaid + currentCardPaymentsPaid;

  // Aggregate all expenses (daily + fixed) by category in ARS
  const categoryTotals: Record<CategoryId, number> = {
    supermercado: 0,
    salidas_comida: 0,
    combustible: 0,
    transporte: 0,
    farmacia: 0,
    servicios: 0,
    hogar: 0,
    ocio: 0,
    ropa: 0,
    otros: 0,
  };

  expenses.forEach(e => {
    if ((e.currency || 'ARS') === 'ARS') {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    }
  });

  fixedExpenses.forEach(f => {
    if ((f.currency || 'ARS') === 'ARS') {
      categoryTotals[f.category] = (categoryTotals[f.category] || 0) + f.amount;
    }
  });

  const totalAllTracked = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  // 2. Cargar datos del mes previo de localStorage
  const getPrevKey = (periodKey: string): string => {
    const [yStr, mStr] = periodKey.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (m === 1) return `${y - 1}-12`;
    return `${y}-${String(m - 1).padStart(2, '0')}`;
  };

  const prevPeriodKey = getPrevKey(currentPeriodKey);

  const prevPeriodData = useMemo<FinanceData | null>(() => {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(`finanflow_period_${prevPeriodKey}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && (Array.isArray(parsed.expenses) || Array.isArray(parsed.fixedExpenses))) {
        return parsed;
      }
    } catch (e) {
      console.error('Error loading previous period for analysis', e);
    }
    return null;
  }, [prevPeriodKey]);

  // Métricas del mes anterior
  const prevMetrics = useMemo(() => {
    if (!prevPeriodData) return null;

    const prevExpenses = Array.isArray(prevPeriodData.expenses) ? prevPeriodData.expenses : [];
    const prevFixed = Array.isArray(prevPeriodData.fixedExpenses) ? prevPeriodData.fixedExpenses : [];
    const prevCards = Array.isArray(prevPeriodData.creditCards) ? prevPeriodData.creditCards : [];

    const prevCashDebit = prevExpenses
      .filter(e => (e.currency || 'ARS') === 'ARS' && e.paymentMethod !== 'credit_card')
      .reduce((sum, e) => sum + e.amount, 0);

    const prevFixedPaid = prevFixed
      .filter(f => (f.currency || 'ARS') === 'ARS' && f.paymentMethod !== 'credit_card' && f.isPaid)
      .reduce((sum, f) => sum + f.amount, 0);

    const prevCardPaid = prevCards
      .reduce((sum, c) => sum + (c.amountPaid || 0), 0);

    const prevTotalEgresos = prevCashDebit + prevFixedPaid + prevCardPaid;

    const prevCatTotals: Record<CategoryId, number> = {
      supermercado: 0,
      salidas_comida: 0,
      combustible: 0,
      transporte: 0,
      farmacia: 0,
      servicios: 0,
      hogar: 0,
      ocio: 0,
      ropa: 0,
      otros: 0,
    };

    prevExpenses.forEach(e => {
      if ((e.currency || 'ARS') === 'ARS') {
        prevCatTotals[e.category] = (prevCatTotals[e.category] || 0) + e.amount;
      }
    });
    prevFixed.forEach(f => {
      if ((f.currency || 'ARS') === 'ARS') {
        prevCatTotals[f.category] = (prevCatTotals[f.category] || 0) + f.amount;
      }
    });

    const hasData = prevTotalEgresos > 0 || prevExpenses.length > 0 || prevFixed.length > 0;

    return {
      hasData,
      prevTotalEgresos,
      prevCatTotals,
    };
  }, [prevPeriodData]);

  // Comparativa vs Mes Anterior
  const comparison = useMemo(() => {
    if (!prevMetrics || !prevMetrics.hasData) {
      return { hasComparison: false as const };
    }

    const prevTotal = prevMetrics.prevTotalEgresos;
    const currentTotal = currentTotalEgresos;
    const diff = currentTotal - prevTotal;
    const pct = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : (currentTotal > 0 ? 100 : 0);

    return {
      hasComparison: true as const,
      prevTotal,
      currentTotal,
      diff,
      pct,
      isLess: diff < 0,
      isEqual: diff === 0,
      isMore: diff > 0,
    };
  }, [prevMetrics, currentTotalEgresos]);

  // 3. Recomendaciones de ajuste y recorte por categoría (Top 2 oportunidades)
  const categoryOpportunities = useMemo(() => {
    const list: {
      category: typeof CATEGORIES[number];
      currentTotal: number;
      prevTotal: number;
      increaseAmount: number;
      increasePct: number;
      shareOfTotalPct: number;
      isNonEssential: boolean;
      title: string;
      suggestion: string;
      weeklyCut: number;
      impactPctOnAvailable: number;
    }[] = [];

    const nonEssentialIds: CategoryId[] = ['salidas_comida', 'ocio', 'ropa', 'otros'];

    CATEGORIES.forEach(cat => {
      const current = categoryTotals[cat.id] || 0;
      const prev = prevMetrics?.prevCatTotals ? (prevMetrics.prevCatTotals[cat.id] || 0) : 0;
      const diff = current - prev;
      const incPct = prev > 0 ? Math.round((diff / prev) * 100) : (current > 0 ? 100 : 0);
      const share = totalAllTracked > 0 ? Math.round((current / totalAllTracked) * 100) : 0;
      const isNonEssential = nonEssentialIds.includes(cat.id);

      if (current > 0) {
        // Sugerir recorte semanal (~20-25% del total mensual dividido 4 semanas redondeado)
        const weeklyCut = Math.max(1500, Math.round((current * 0.22) / 4 / 500) * 500);
        const monthlyCut = weeklyCut * 4;
        const baseAvailable = Math.max(1, saldoNetoDisponible > 0 ? saldoNetoDisponible : totalIncome > 0 ? totalIncome * 0.2 : 120000);
        const impactPct = Math.max(5, Math.round((monthlyCut / baseAvailable) * 100));

        let title = '';
        let suggestion = '';

        if (diff > 0 && prev > 0) {
          title = `Aumento de +${incPct}% vs. mes previo`;
          suggestion = `Tus gastos en ${cat.label} subieron un ${incPct}% respecto al mes anterior. Recortar ${formatMoney(weeklyCut, currencySymbol)} semanales aquí aumentaría tu disponible un +${impactPct}%.`;
        } else if (share >= 30 && isNonEssential) {
          title = `Concentra el ${share}% del presupuesto`;
          suggestion = `${cat.label} representa el ${share}% de tus gastos totales. Establecer un límite semanal y recortar ${formatMoney(weeklyCut, currencySymbol)} por semana liberaría ${formatMoney(monthlyCut, currencySymbol)} al mes.`;
        } else if (isNonEssential && current > 20000) {
          title = `Gasto discrecional optimizable`;
          suggestion = `Llevas ${formatMoney(current, currencySymbol)} en ${cat.label}. Reducir 1 o 2 consumos menores (${formatMoney(weeklyCut, currencySymbol)}/semana) ampliaría tu margen disponible un +${impactPct}%.`;
        } else if (share >= 30) {
          title = `Mayor peso en egresos (${share}%)`;
          suggestion = `${cat.label} concentra el ${share}% de tus egresos. Aprovechar promociones y compras programadas te permitiría economizar cerca de ${formatMoney(weeklyCut * 2, currencySymbol)} al mes.`;
        } else {
          title = `Optimización sugerida`;
          suggestion = `Monitorea tus salidas en ${cat.label}: moderar pequeños gastos prescindibles sumaría ${formatMoney(monthlyCut, currencySymbol)} extra a tu ahorro mensual.`;
        }

        list.push({
          category: cat,
          currentTotal: current,
          prevTotal: prev,
          increaseAmount: diff,
          increasePct: incPct,
          shareOfTotalPct: share,
          isNonEssential,
          title,
          suggestion,
          weeklyCut,
          impactPctOnAvailable: impactPct,
        });
      }
    });

    // Ordenar priorizando:
    // 1. Categorías con mayor incremento positivo respecto al mes previo
    // 2. Categorías no esenciales con alto peso (>25%)
    // 3. Mayor monto total de gasto
    list.sort((a, b) => {
      if (a.increaseAmount > 0 && b.increaseAmount <= 0) return -1;
      if (b.increaseAmount > 0 && a.increaseAmount <= 0) return 1;
      if (a.increaseAmount > 0 && b.increaseAmount > 0) {
        return b.increasePct - a.increasePct;
      }
      if (a.isNonEssential && !b.isNonEssential && a.shareOfTotalPct > 20) return -1;
      if (b.isNonEssential && !a.isNonEssential && b.shareOfTotalPct > 20) return 1;
      return b.currentTotal - a.currentTotal;
    });

    return list.slice(0, 2);
  }, [categoryTotals, prevMetrics, totalAllTracked, saldoNetoDisponible, totalIncome, currencySymbol]);

  // Sort categories by expenditure for breakdown
  const sortedCategories = CATEGORIES
    .map(cat => ({
      ...cat,
      total: categoryTotals[cat.id] || 0,
      percentage: totalAllTracked > 0 ? Math.round(((categoryTotals[cat.id] || 0) / totalAllTracked) * 100) : 0,
    }))
    .filter(cat => cat.total > 0)
    .sort((a, b) => b.total - a.total);

  const topCategory = sortedCategories[0];

  // Days left in current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysLeft = Math.max(1, totalDaysInMonth - currentDay);

  // Suggested daily budget
  const safeDailyBudget = saldoNetoDisponible > 0 ? Math.floor(saldoNetoDisponible / daysLeft) : 0;

  // Credit card minimum payment diagnosis
  const cardsWithMinPaymentOnly = creditCards.filter(c => {
    return c.statementBalance > 0 && c.amountPaid > 0 && c.amountPaid < c.statementBalance;
  });

  const hasHighCreditDebt = creditCards.some(c => (c.statementBalance - c.amountPaid) > 100000);

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          Análisis Inteligente
        </h2>
        <p className="text-xs text-slate-400">
          Diagnóstico, comparativas y consejos en lenguaje cotidiano sin rodeos
        </p>
      </div>

      {/* 1. Diagnóstico de Flujo de Caja & Balance */}
      {totalIncome === 0 && totalAllTracked === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-white/5 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <Sparkles size={26} />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">Sin registros para analizar en este período</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Carga tus ingresos y gastos diarios para recibir diagnósticos de flujo de caja, consejos de ahorro y desglose de gastos en tiempo real.
          </p>
        </div>
      ) : (
        <div className={`p-4 rounded-3xl border shadow-lg ${
          saldoNetoDisponible < 0 
            ? 'bg-rose-950/40 border-rose-500/30 text-rose-100' 
            : saldoNetoDisponible < (totalIncome * 0.15)
            ? 'bg-amber-950/30 border-amber-500/30 text-amber-100'
            : 'bg-emerald-950/30 border-emerald-500/25 text-emerald-100'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-2xl flex-shrink-0 ${
              saldoNetoDisponible < 0 
                ? 'bg-rose-500/20 text-rose-400' 
                : saldoNetoDisponible < (totalIncome * 0.15)
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {saldoNetoDisponible < 0 ? (
                <AlertTriangle size={22} />
              ) : saldoNetoDisponible < (totalIncome * 0.15) ? (
                <TrendingDown size={22} />
              ) : (
                <TrendingUp size={22} />
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">
                {saldoNetoDisponible < 0 
                  ? 'Déficit: Estás gastando más de lo que ingresa'
                  : saldoNetoDisponible < (totalIncome * 0.15)
                  ? 'Margen ajustado para cerrar el mes'
                  : 'Salud financiera positiva'}
              </h3>

              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {saldoNetoDisponible < 0 ? (
                  <>
                    Tus gastos en efectivo y servicios superan tus ingresos por{' '}
                    <strong className="text-rose-400">{formatMoney(Math.abs(saldoNetoDisponible), currencySymbol)}</strong>. 
                    Frena consumos prescindibles para evitar endeudarte en descubierto.
                  </>
                ) : saldoNetoDisponible < (totalIncome * 0.15) ? (
                  <>
                    Te queda un margen de {formatMoney(saldoNetoDisponible, currencySymbol)}. Cuida las salidas y compras imprevistas en los próximos {daysLeft} días.
                  </>
                ) : (
                  <>
                    Tienes {formatMoney(saldoNetoDisponible, currencySymbol)} disponibles limpios tras cubrir tus gastos actuales. ¡Vas con buen colchón!
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Daily suggested pace pill */}
          {saldoNetoDisponible > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <CalendarDays size={14} className="text-emerald-400 shrink-0" />
                <span>Ritmo diario sugerido ({daysLeft} {daysLeft === 1 ? 'día restante' : 'días restantes'}):</span>
              </span>
              <span className="whitespace-nowrap px-3 py-1 text-xs font-semibold text-white bg-white/10 rounded-lg text-center sm:text-right">
                Hasta {formatMoney(safeDailyBudget, currencySymbol)} / día
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. NUEVA: Comparativa vs. Mes Anterior */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-white/10 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <CalendarDays size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Comparativa vs. Mes Anterior
              </h3>
              <p className="text-[11px] text-slate-400">
                {formatPeriodSpanish(currentPeriodKey)} vs. {formatPeriodSpanish(prevPeriodKey)}
              </p>
            </div>
          </div>
        </div>

        {comparison.hasComparison ? (
          <div className="space-y-3">
            {/* Variation Badge */}
            <div className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
              comparison.isLess
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : comparison.isMore
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-800/80 border-white/10 text-slate-300'
            }`}>
              <div className={`p-1.5 rounded-xl shrink-0 ${
                comparison.isLess
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : comparison.isMore
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {comparison.isLess ? (
                  <ArrowDownRight size={18} />
                ) : comparison.isMore ? (
                  <ArrowUpRight size={18} />
                ) : (
                  <Minus size={18} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-snug">
                  {comparison.isLess ? (
                    <span>↓ {Math.abs(comparison.pct)}% menos que el mes pasado - ¡Excelente control!</span>
                  ) : comparison.isMore ? (
                    <span>↑ {comparison.pct}% más que el mes pasado</span>
                  ) : (
                    <span>↔ Mismo nivel de egresos que el mes anterior</span>
                  )}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {comparison.isLess ? (
                    <>Ahorraste <strong>{formatMoney(Math.abs(comparison.diff), currencySymbol)}</strong> respecto a {formatPeriodSpanish(prevPeriodKey)}.</>
                  ) : comparison.isMore ? (
                    <>Llevas <strong>{formatMoney(comparison.diff, currencySymbol)}</strong> adicionales de egresos liquidados.</>
                  ) : (
                    <>Mismo volumen de egresos liquidados entre períodos.</>
                  )}
                </p>
              </div>
            </div>

            {/* Metrics 2-column comparison */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider truncate">
                  Este Período
                </span>
                <p className="text-sm sm:text-base font-extrabold text-white mt-1 tabular-nums">
                  {formatMoney(comparison.currentTotal, currencySymbol)}
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {formatPeriodSpanish(currentPeriodKey)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider truncate">
                  Mes Anterior
                </span>
                <p className="text-sm sm:text-base font-extrabold text-slate-300 mt-1 tabular-nums">
                  {formatMoney(comparison.prevTotal, currencySymbol)}
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {formatPeriodSpanish(prevPeriodKey)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/5 flex items-center gap-3">
            <Info size={18} className="text-indigo-400 shrink-0" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Primer mes registrado: la comparativa se activará al iniciar el próximo período.
            </p>
          </div>
        )}
      </div>

      {/* 3. NUEVA: Oportunidades de Ajuste y Recorte por Categoría */}
      {categoryOpportunities.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-white/10 shadow-lg space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Target size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Oportunidades de Ajuste
                </h3>
                <p className="text-[11px] text-slate-400">
                  Recomendaciones accionables de recorte para optimizar tu disponible
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {categoryOpportunities.map(op => (
              <div 
                key={op.category.id}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 mb-2 w-full">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div 
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: op.category.bgLight, color: op.category.color }}
                    >
                      <CategoryIcon categoryId={op.category.id} size={14} />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {op.category.label}
                    </span>
                  </div>

                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border border-amber-500/30 text-amber-300 bg-amber-500/10">
                    {op.title}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {op.suggestion}
                </p>

                <div className="flex items-end justify-between gap-3 pt-3 mt-3 border-t border-white/5 w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">Total computado</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-200 whitespace-nowrap">
                      {formatMoney(op.currentTotal, currencySymbol)}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-block text-[11px] sm:text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg whitespace-nowrap">
                      Recorte sugerido: {formatMoney(op.weeklyCut, currencySymbol)}/sem
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Alerta de Tarjetas y Trampa del Pago Mínimo */}
      {(cardsWithMinPaymentOnly.length > 0 || hasHighCreditDebt) && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-lg">
          <div className="flex items-start gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 flex-shrink-0 mt-0.5">
              <ShieldAlert size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white">
                Ojo con la trampa del Pago Mínimo en Tarjetas
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-1 mb-3">
                Pagar solo el mínimo o financiar saldos de tarjeta arrastra tasas que frecuentemente <strong>superan el 100% - 150% anual</strong>.
                El interés de financiación se calcula sobre el saldo no abonado y se acumula en el próximo resumen.
              </p>
              <div className="p-3 rounded-xl bg-black/25 border border-yellow-500/10 text-xs text-amber-200/90 leading-relaxed">
                💡 <strong>Consejo concreto:</strong> Destina cualquier excedente a liquidar el total de la tarjeta antes que gastos de recreación para cortar el drenaje de intereses bancarios.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Detección del Mayor Gasto */}
      {topCategory && topCategory.total > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-white/10 shadow-lg">
          <div className="flex items-start gap-3">
            <div 
              className="p-2.5 rounded-2xl flex-shrink-0 mt-0.5"
              style={{ backgroundColor: topCategory.bgLight, color: topCategory.color }}
            >
              <CategoryIcon categoryId={topCategory.id} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] sm:text-xs uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                  Mayor Salida de Dinero
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-white shrink-0">
                  {topCategory.percentage}% del total
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1">
                {topCategory.label}: {formatMoney(topCategory.total, currencySymbol)}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                El <strong className="text-white">{topCategory.percentage}%</strong> de todo lo gastado y comprometido este mes se concentró en <strong>{topCategory.label}</strong>.
              </p>

              {/* Concrete advice per category */}
              <div className="mt-3 p-3 rounded-xl bg-black/20 border border-white/5 text-xs leading-relaxed text-slate-300">
                {topCategory.id === 'salidas_comida' || topCategory.id === 'ocio' ? (
                  <span>🎯 <strong>Sugerencia de recorte:</strong> Establece un tope semanal para delivery y salidas con amigos. Reemplazar 2 pedidos semanales por cocina casera liberaría aprox. {formatMoney(Math.round(topCategory.total * 0.25), currencySymbol)} este mes.</span>
                ) : topCategory.id === 'supermercado' ? (
                  <span>🛒 <strong>Sugerencia de compra:</strong> Aprovecha días de descuento bancario (15-20%) en supermercados y arma listas cerradas sin extras de góndola.</span>
                ) : topCategory.id === 'combustible' ? (
                  <span>⛽ <strong>Sugerencia de movilidad:</strong> Carga combustible con apps que ofrecen 10% de reintegro (YPF App, Shell Box) y combina trayectos.</span>
                ) : (
                  <span>💡 <strong>Consejo:</strong> Revisa suscripciones que no uses a diario; recortar un servicio libera liquidez inmediata.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Desglose Completo por Categoría */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <PieChart size={16} className="text-indigo-400" />
            <span>Desglose por Categorías</span>
          </h3>
          <span className="text-xs text-slate-400">
            Total: {formatMoney(totalAllTracked, currencySymbol)}
          </span>
        </div>

        {sortedCategories.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            Aún no hay gastos registrados para analizar.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedCategories.map(cat => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cat.bgLight, color: cat.color }}
                    >
                      <CategoryIcon categoryId={cat.id} size={12} />
                    </div>
                    <span className="font-medium text-slate-200">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">
                      {formatMoney(cat.total, currencySymbol)}
                    </span>
                    <span className="text-[11px] text-slate-400 w-8 text-right font-medium">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.max(2, cat.percentage)}%`,
                      backgroundColor: cat.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
