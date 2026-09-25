import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FinanceData, 
  Expense, 
  Income, 
  FixedExpense, 
  CreditCard, 
  CardPayment,
  InstallmentPurchase,
  CategoryId, 
  PaymentMethod, 
  Currency 
} from '../types/finance';
import { setGlobalPrivacyMode } from '../utils/format';

export const getCurrentPeriodKey = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getPreviousPeriodKey = (offsetMonths: number = 1): string => {
  const today = new Date();
  today.setMonth(today.getMonth() - offsetMonths);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const STORAGE_PREFIX = 'finanflow_period_';
const PERIODS_INDEX_KEY = 'finanflow_periods_index';
const LEGACY_STORAGE_KEY = 'finanflow_v1_data';

const getInitialSeedData = (periodKey?: string): FinanceData => {
  const targetKey = periodKey || getCurrentPeriodKey();
  const [yearStr, monthStr] = targetKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = monthStr;
  const currentKey = getCurrentPeriodKey();
  const isPastMonth = targetKey < currentKey;
  const day = isPastMonth ? '15' : String(new Date().getDate()).padStart(2, '0');
  const todayIso = `${year}-${month}-${day}`;

  return {
    currencySymbol: '$',
    incomes: [
      {
        id: `inc-1-${targetKey}`,
        amount: 850000,
        source: 'Sueldo Principal',
        note: 'Transferencia sueldo neto',
        date: `${year}-${month}-05`,
        createdAt: Date.now() - 86400000 * 4,
        currency: 'ARS',
      },
      {
        id: `inc-2-${targetKey}`,
        amount: 140000,
        source: 'Honorarios / Freelance',
        note: 'Proyecto cliente',
        date: `${year}-${month}-12`,
        createdAt: Date.now() - 86400000 * 2,
        currency: 'ARS',
      },
    ],
    expenses: [
      {
        id: `exp-1-${targetKey}`,
        amount: 28400,
        category: 'supermercado',
        paymentMethod: 'cash_debit',
        note: 'Compra semanal frutas, carnes y despensa',
        date: todayIso,
        createdAt: Date.now() - 3600000 * 5,
        currency: 'ARS',
      },
      {
        id: `exp-2-${targetKey}`,
        amount: 7800,
        category: 'salidas_comida',
        paymentMethod: 'cash_debit',
        note: 'Almuerzo con compañeros de oficina',
        date: todayIso,
        createdAt: Date.now() - 3600000 * 2,
        currency: 'ARS',
      },
      {
        id: `exp-3-${targetKey}`,
        amount: 36000,
        category: 'combustible',
        paymentMethod: 'credit_card',
        creditCardId: 'card-1',
        note: 'Tanque lleno YPF Infinia',
        date: todayIso,
        createdAt: Date.now() - 86400000,
        currency: 'ARS',
      },
      {
        id: `exp-4-${targetKey}`,
        amount: 9500,
        category: 'farmacia',
        paymentMethod: 'cash_debit',
        note: 'Medicamentos y analgésicos',
        date: todayIso,
        createdAt: Date.now() - 86400000 * 2,
        currency: 'ARS',
      },
      {
        id: `exp-5-${targetKey}`,
        amount: 18500,
        category: 'ocio',
        paymentMethod: 'credit_card',
        creditCardId: 'card-1',
        note: 'Cena delivery viernes',
        date: todayIso,
        createdAt: Date.now() - 86400000 * 3,
        currency: 'ARS',
      },
    ],
    fixedExpenses: [
      {
        id: `fix-1-${targetKey}`,
        title: 'Alquiler Depto',
        amount: 280000,
        dueDay: 10,
        isPaid: true,
        category: 'hogar',
        paidAt: `${year}-${month}-08`,
        currency: 'ARS',
        paymentMethod: 'cash_debit',
      },
      {
        id: `fix-2-${targetKey}`,
        title: 'Expensas Edificio',
        amount: 52000,
        dueDay: 15,
        isPaid: true,
        category: 'hogar',
        paidAt: `${year}-${month}-12`,
        currency: 'ARS',
        paymentMethod: 'cash_debit',
      },
      {
        id: `fix-3-${targetKey}`,
        title: 'Internet Fibra 300Mb',
        amount: 19800,
        dueDay: 22,
        isPaid: isPastMonth,
        paidAt: isPastMonth ? `${year}-${month}-22` : undefined,
        category: 'servicios',
        currency: 'ARS',
        paymentMethod: 'cash_debit',
      },
      {
        id: `fix-4-${targetKey}`,
        title: 'Electricidad Edenor',
        amount: 24500,
        dueDay: 26,
        isPaid: isPastMonth,
        paidAt: isPastMonth ? `${year}-${month}-26` : undefined,
        category: 'servicios',
        currency: 'ARS',
        paymentMethod: 'cash_debit',
      },
      {
        id: `fix-5-${targetKey}`,
        title: 'Línea Celular Móvil',
        amount: 13200,
        dueDay: 28,
        isPaid: isPastMonth,
        paidAt: isPastMonth ? `${year}-${month}-28` : undefined,
        category: 'servicios',
        currency: 'ARS',
        paymentMethod: 'cash_debit',
      },
      {
        id: `fix-6-${targetKey}`,
        title: 'Gimnasio Pase Libre',
        amount: 26000,
        dueDay: 5,
        isPaid: true,
        category: 'ocio',
        paidAt: `${year}-${month}-04`,
        currency: 'ARS',
        paymentMethod: 'cash_debit',
      },
    ],
    creditCards: [
      {
        id: 'card-1',
        name: 'Visa Signature',
        bankName: 'Galicia',
        lastDigits: '4819',
        colorGradient: 'from-blue-700 via-indigo-800 to-slate-950',
        statementBalance: 165000,
        minPayment: 33000,
        dueDay: 28,
        amountPaid: isPastMonth ? 165000 : 0,
        closingDay: 20,
        payments: isPastMonth ? [
          {
            id: `pay-seed-gal-${targetKey}`,
            amount: 165000,
            date: `${year}-${month}-26`,
            note: 'Pago total resumen cierre',
            createdAt: Date.now() - 86400000 * 20,
            deductedFromCash: true,
            currency: 'ARS',
          }
        ] : [],
        statementBalanceUSD: 45,
        amountPaidUSD: isPastMonth ? 45 : 0,
      },
      {
        id: 'card-2',
        name: 'Mastercard Black',
        bankName: 'Santander',
        lastDigits: '7201',
        colorGradient: 'from-zinc-900 via-rose-950 to-neutral-950',
        statementBalance: 58000,
        minPayment: 11600,
        dueDay: 12,
        amountPaid: isPastMonth ? 58000 : 20000,
        closingDay: 4,
        payments: [
          {
            id: `pay-seed-1-${targetKey}`,
            amount: isPastMonth ? 58000 : 20000,
            date: `${year}-${month}-10`,
            note: 'Abono vía homebanking',
            createdAt: Date.now() - 86400000 * 2,
            deductedFromCash: false,
            currency: 'ARS',
          },
        ],
        statementBalanceUSD: 0,
        amountPaidUSD: 0,
      },
    ],
    installmentPurchases: [
      {
        id: `inst-seed-1`,
        creditCardId: 'card-1',
        description: 'Smart TV Samsung 55"',
        totalAmount: 360000,
        installmentAmount: 60000,
        totalInstallments: 6,
        currentInstallment: isPastMonth ? 1 : 2,
        category: 'hogar',
        currency: 'ARS',
        createdAt: Date.now() - 86400000 * 25,
        startPeriod: '2026-08',
      },
    ],
    usdInitialBalance: 1250,
    lastUpdated: Date.now(),
  };
};

export function triggerHaptic(type: 'light' | 'medium' | 'success' = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'light') navigator.vibrate(10);
      else if (type === 'medium') navigator.vibrate(20);
      else if (type === 'success') navigator.vibrate([15, 40, 20]);
    } catch {
      // Ignore vibration error
    }
  }
}

const loadPeriodData = (periodKey: string): FinanceData => {
  try {
    const isCleanMode = typeof localStorage !== 'undefined' && localStorage.getItem('finanflow_initialized') === 'true';
    const periodStored = localStorage.getItem(`${STORAGE_PREFIX}${periodKey}`);
    if (periodStored) {
      const parsed = JSON.parse(periodStored);
      if (parsed && Array.isArray(parsed.expenses) && Array.isArray(parsed.fixedExpenses)) {
        if (!Array.isArray(parsed.installmentPurchases)) {
          parsed.installmentPurchases = [];
        }
        if (!Array.isArray(parsed.incomes)) {
          parsed.incomes = [];
        }
        if (!Array.isArray(parsed.creditCards)) {
          parsed.creditCards = [];
        }
        return parsed;
      }
    }

    // Fallback: check legacy storage if loading current calendar period
    const currentPeriod = getCurrentPeriodKey();
    if (periodKey === currentPeriod) {
      const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyStored) {
        const parsed = JSON.parse(legacyStored);
        if (parsed && Array.isArray(parsed.expenses) && Array.isArray(parsed.fixedExpenses)) {
          if (!Array.isArray(parsed.installmentPurchases)) {
            parsed.installmentPurchases = [];
          }
          if (!Array.isArray(parsed.incomes)) {
            parsed.incomes = [];
          }
          if (!Array.isArray(parsed.creditCards)) {
            parsed.creditCards = [];
          }
          return parsed;
        }
      }
    }

    // Try to base new period on current/previous period to preserve custom cards & recurring structure
    let baseData: FinanceData | null = null;
    const currentStored = localStorage.getItem(`${STORAGE_PREFIX}${currentPeriod}`) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (currentStored) {
      try {
        baseData = JSON.parse(currentStored);
      } catch {}
    }

    if (baseData && Array.isArray(baseData.creditCards)) {
      const [newYearStr, newMonthStr] = periodKey.split('-');
      const newYear = parseInt(newYearStr, 10);
      const newMonth = newMonthStr;

      // Advance active installments by 1
      const advancedInstallments = (baseData.installmentPurchases || [])
        .map(ip => ({
          ...ip,
          currentInstallment: ip.currentInstallment + 1,
        }))
        .filter(ip => ip.currentInstallment <= ip.totalInstallments);

      // Reset cards: amountPaid = 0, payments = []
      const carriedCards = baseData.creditCards.map(c => {
        const closingD = c.closingDay || 20;
        const dueD = c.dueDay || 10;
        return {
          ...c,
          amountPaid: 0,
          amountPaidUSD: 0,
          payments: [],
          closingDate: `${newYear}-${newMonth}-${String(closingD).padStart(2, '0')}`,
          dueDate: `${newYear}-${newMonth}-${String(dueD).padStart(2, '0')}`,
        };
      });

      // Reset fixed expenses: isPaid = false
      const carriedFixed = (baseData.fixedExpenses || []).map(f => ({
        ...f,
        isPaid: false,
        paidAt: undefined,
      }));

      const newPeriodData: FinanceData = {
        currencySymbol: baseData.currencySymbol || '$',
        incomes: (baseData.incomes || []).map(inc => ({
          ...inc,
          id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          date: `${newYear}-${newMonth}-05`,
          createdAt: Date.now(),
        })),
        expenses: [], // Fresh start for new month daily expenses
        fixedExpenses: carriedFixed,
        creditCards: carriedCards,
        installmentPurchases: advancedInstallments,
        usdInitialBalance: baseData.usdInitialBalance || 0,
        lastUpdated: Date.now(),
      };

      try {
        localStorage.setItem(`${STORAGE_PREFIX}${periodKey}`, JSON.stringify(newPeriodData));
      } catch {}
      return newPeriodData;
    }

    // If app was initialized in clean mode or user erased demo, return clean zero-data period
    if (isCleanMode) {
      const cleanData: FinanceData = {
        currencySymbol: '$',
        incomes: [],
        expenses: [],
        fixedExpenses: [],
        creditCards: [],
        installmentPurchases: [],
        usdInitialBalance: 0,
        lastUpdated: Date.now(),
      };
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${periodKey}`, JSON.stringify(cleanData));
      } catch {}
      return cleanData;
    }
  } catch (e) {
    console.error(`Failed reading storage for period ${periodKey}`, e);
  }

  // Generate seed data for this period if no prior data existed and not in clean mode
  const initial = getInitialSeedData(periodKey);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${periodKey}`, JSON.stringify(initial));
  } catch {}
  return initial;
};

export function useFinanceStore() {
  const currentPeriodKey = useMemo(() => getCurrentPeriodKey(), []);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentPeriodKey);
  const isViewingHistory = selectedPeriod !== currentPeriodKey;

  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('finanflow_privacy_mode') === 'true';
    } catch {
      return false;
    }
  });

  const togglePrivacyMode = useCallback(() => {
    triggerHaptic('light');
    setPrivacyMode(prev => {
      const next = !prev;
      setGlobalPrivacyMode(next);
      return next;
    });
  }, []);

  // Track all recorded periods for the selector
  const [periodsIndex, setPeriodsIndex] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(PERIODS_INDEX_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.includes(currentPeriodKey)) {
            parsed.unshift(currentPeriodKey);
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    const prevMonth = getPreviousPeriodKey(1);
    const initialList = [currentPeriodKey, prevMonth];
    try {
      localStorage.setItem(PERIODS_INDEX_KEY, JSON.stringify(initialList));
      // Pre-seed previous month historical data if not present
      if (!localStorage.getItem(`${STORAGE_PREFIX}${prevMonth}`)) {
        const prevData = getInitialSeedData(prevMonth);
        localStorage.setItem(`${STORAGE_PREFIX}${prevMonth}`, JSON.stringify(prevData));
      }
    } catch {}
    return initialList;
  });

  const [data, setData] = useState<FinanceData>(() => {
    return loadPeriodData(currentPeriodKey);
  });

  // Save data to localStorage whenever data or selectedPeriod changes
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${selectedPeriod}`, JSON.stringify(data));
      
      // If we are on the current real period, also keep legacy key synced for backup compatibility
      if (selectedPeriod === currentPeriodKey) {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(data));
      }

      // Ensure this period is registered in the periods index
      setPeriodsIndex(prev => {
        if (!prev.includes(selectedPeriod)) {
          const updated = [selectedPeriod, ...prev].sort().reverse();
          try {
            localStorage.setItem(PERIODS_INDEX_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        }
        return prev;
      });
    } catch (e) {
      console.error('Error saving finance data to localStorage', e);
    }
  }, [data, selectedPeriod, currentPeriodKey]);

  // Switch between months
  const switchPeriod = useCallback((targetPeriod: string) => {
    triggerHaptic('light');
    setSelectedPeriod(targetPeriod);
    const loaded = loadPeriodData(targetPeriod);
    setData(loaded);
  }, []);

  // Return to the current month in 1 tap
  const returnToCurrentPeriod = useCallback(() => {
    triggerHaptic('medium');
    switchPeriod(currentPeriodKey);
  }, [currentPeriodKey, switchPeriod]);

  // Actions
  const addExpense = useCallback((payload: {
    amount: number;
    category: CategoryId;
    paymentMethod: PaymentMethod;
    creditCardId?: string;
    note?: string;
    date?: string;
    currency?: Currency;
    installmentInfo?: {
      current: number;
      total: number;
      installmentAmount: number;
      totalAmount?: number;
    };
  }) => {
    triggerHaptic('success');
    const newExpense: Expense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      amount: payload.amount,
      category: payload.category,
      paymentMethod: payload.paymentMethod,
      creditCardId: payload.creditCardId,
      note: payload.note?.trim() || '',
      date: payload.date || new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      currency: payload.currency || 'ARS',
      installmentInfo: payload.installmentInfo,
    };

    setData(prev => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
      lastUpdated: Date.now(),
    }));

    return newExpense;
  }, []);

  const deleteExpense = useCallback((id: string) => {
    triggerHaptic('medium');
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id),
      lastUpdated: Date.now(),
    }));
  }, []);

  const addIncome = useCallback((payload: {
    amount: number;
    source: string;
    note?: string;
    date?: string;
    currency?: Currency;
  }) => {
    triggerHaptic('success');
    const newIncome: Income = {
      id: 'inc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      amount: payload.amount,
      source: payload.source.trim(),
      note: payload.note?.trim() || '',
      date: payload.date || new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      currency: payload.currency || 'ARS',
    };

    setData(prev => ({
      ...prev,
      incomes: [newIncome, ...prev.incomes],
      lastUpdated: Date.now(),
    }));

    return newIncome;
  }, []);

  const deleteIncome = useCallback((id: string) => {
    triggerHaptic('medium');
    setData(prev => ({
      ...prev,
      incomes: prev.incomes.filter(inc => inc.id !== id),
      lastUpdated: Date.now(),
    }));
  }, []);

  const updateIncome = useCallback((id: string, payload: {
    amount: number;
    source: string;
    note?: string;
    date?: string;
    currency?: Currency;
  }) => {
    triggerHaptic('success');
    setData(prev => ({
      ...prev,
      incomes: prev.incomes.map(inc => {
        if (inc.id !== id) return inc;
        return {
          ...inc,
          amount: Math.max(0, payload.amount),
          source: payload.source.trim() || inc.source,
          note: payload.note !== undefined ? payload.note.trim() : inc.note,
          date: payload.date || inc.date,
          currency: payload.currency || inc.currency || 'ARS',
        };
      }),
      lastUpdated: Date.now(),
    }));
  }, []);

  const toggleFixedExpense = useCallback((id: string) => {
    triggerHaptic('light');
    const todayIso = new Date().toISOString().split('T')[0];
    setData(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.map(fix => {
        if (fix.id !== id) return fix;
        // Si está en débito automático en tarjeta, no se paga manualmente con checkbox
        if (fix.paymentMethod === 'credit_card') return fix;
        const newPaid = !fix.isPaid;
        return {
          ...fix,
          isPaid: newPaid,
          paidAt: newPaid ? todayIso : undefined,
        };
      }),
      lastUpdated: Date.now(),
    }));
  }, []);

  const addFixedExpense = useCallback((payload: {
    title: string;
    amount: number;
    dueDay: number;
    category: CategoryId;
    currency?: Currency;
    paymentMethod?: PaymentMethod;
    creditCardId?: string;
  }) => {
    triggerHaptic('success');
    const newFixed: FixedExpense = {
      id: 'fix-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: payload.title.trim(),
      amount: payload.amount,
      dueDay: payload.dueDay,
      category: payload.category,
      isPaid: false,
      currency: payload.currency || 'ARS',
      paymentMethod: payload.paymentMethod || 'cash_debit',
      creditCardId: payload.paymentMethod === 'credit_card' ? payload.creditCardId : undefined,
    };

    setData(prev => ({
      ...prev,
      fixedExpenses: [...prev.fixedExpenses, newFixed],
      lastUpdated: Date.now(),
    }));
  }, []);

  const updateFixedExpense = useCallback((id: string, payload: {
    title: string;
    amount: number;
    dueDay: number;
    category: CategoryId;
    currency?: Currency;
    paymentMethod?: PaymentMethod;
    creditCardId?: string;
  }) => {
    triggerHaptic('success');
    setData(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.map(fix => {
        if (fix.id !== id) return fix;
        return {
          ...fix,
          title: payload.title.trim() || fix.title,
          amount: Math.max(0, payload.amount),
          dueDay: payload.dueDay || fix.dueDay,
          category: payload.category || fix.category,
          currency: payload.currency || fix.currency || 'ARS',
          paymentMethod: payload.paymentMethod || fix.paymentMethod || 'cash_debit',
          creditCardId: payload.paymentMethod === 'credit_card' ? payload.creditCardId : undefined,
        };
      }),
      lastUpdated: Date.now(),
    }));
  }, []);

  const deleteFixedExpense = useCallback((id: string) => {
    triggerHaptic('medium');
    setData(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.filter(f => f.id !== id),
      lastUpdated: Date.now(),
    }));
  }, []);

  // Compras en cuotas (Installment Purchases)
  const addInstallmentPurchase = useCallback((payload: {
    creditCardId: string;
    description: string;
    totalAmount: number;
    installmentAmount: number;
    totalInstallments: number;
    currentInstallment?: number;
    category?: CategoryId;
    currency?: Currency;
  }) => {
    triggerHaptic('success');
    const newInst: InstallmentPurchase = {
      id: 'inst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      creditCardId: payload.creditCardId,
      description: payload.description.trim() || 'Compra en cuotas',
      totalAmount: payload.totalAmount,
      installmentAmount: payload.installmentAmount,
      totalInstallments: Math.max(1, payload.totalInstallments),
      currentInstallment: Math.max(1, payload.currentInstallment || 1),
      category: payload.category || 'otros',
      currency: payload.currency || 'ARS',
      createdAt: Date.now(),
      startPeriod: selectedPeriod,
    };

    setData(prev => ({
      ...prev,
      installmentPurchases: [...(prev.installmentPurchases || []), newInst],
      lastUpdated: Date.now(),
    }));

    return newInst;
  }, [selectedPeriod]);

  const updateInstallmentPurchase = useCallback((id: string, updates: Partial<InstallmentPurchase>) => {
    triggerHaptic('success');
    setData(prev => ({
      ...prev,
      installmentPurchases: (prev.installmentPurchases || []).map(ip => {
        if (ip.id !== id) return ip;
        return {
          ...ip,
          ...updates,
          totalInstallments: updates.totalInstallments ? Math.max(1, updates.totalInstallments) : ip.totalInstallments,
          currentInstallment: updates.currentInstallment ? Math.max(1, updates.currentInstallment) : ip.currentInstallment,
        };
      }),
      lastUpdated: Date.now(),
    }));
  }, []);

  const deleteInstallmentPurchase = useCallback((id: string) => {
    triggerHaptic('medium');
    setData(prev => ({
      ...prev,
      installmentPurchases: (prev.installmentPurchases || []).filter(ip => ip.id !== id),
      lastUpdated: Date.now(),
    }));
  }, []);

  const advanceInstallmentPurchase = useCallback((id: string) => {
    triggerHaptic('light');
    setData(prev => ({
      ...prev,
      installmentPurchases: (prev.installmentPurchases || [])
        .map(ip => {
          if (ip.id !== id) return ip;
          return { ...ip, currentInstallment: ip.currentInstallment + 1 };
        })
        .filter(ip => ip.currentInstallment <= ip.totalInstallments),
      lastUpdated: Date.now(),
    }));
  }, []);

  // Reiniciar todos los fijos como "Pendientes", resetear pagos de tarjeta y avanzar cuotas
  const resetNewMonth = useCallback(() => {
    triggerHaptic('medium');
    setData(prev => {
      // Al iniciar un nuevo mes, las compras en cuotas activas avanzan automáticamente
      // al siguiente número de cuota (ej. pasan de 1/6 a 2/6) hasta completarse, eliminándose al finalizar el ciclo de cuotas
      const nextInstallments = (prev.installmentPurchases || [])
        .map(ip => ({
          ...ip,
          currentInstallment: ip.currentInstallment + 1,
        }))
        .filter(ip => ip.currentInstallment <= ip.totalInstallments);

      return {
        ...prev,
        fixedExpenses: prev.fixedExpenses.map(fix => ({
          ...fix,
          isPaid: false,
          paidAt: undefined,
        })),
        creditCards: prev.creditCards.map(c => ({
          ...c,
          amountPaid: 0,
          amountPaidUSD: 0,
          payments: [],
        })),
        installmentPurchases: nextInstallments,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const updateCreditCard = useCallback((cardId: string, updates: Partial<CreditCard>) => {
    triggerHaptic('light');
    setData(prev => ({
      ...prev,
      creditCards: prev.creditCards.map(card => {
        if (card.id !== cardId) return card;
        return { ...card, ...updates };
      }),
      lastUpdated: Date.now(),
    }));
  }, []);

  const updateCardMinPayment = useCallback((cardId: string, minPayment: number) => {
    triggerHaptic('success');
    setData(prev => ({
      ...prev,
      creditCards: prev.creditCards.map(card => {
        if (card.id !== cardId) return card;
        return { ...card, minPayment: Math.max(0, minPayment) };
      }),
      lastUpdated: Date.now(),
    }));
  }, []);

  const addCreditCard = useCallback((cardData: Omit<CreditCard, 'id' | 'amountPaid'>) => {
    triggerHaptic('success');
    const newCard: CreditCard = {
      ...cardData,
      id: 'card-' + Date.now(),
      amountPaid: 0,
      payments: [],
    };
    setData(prev => ({
      ...prev,
      creditCards: [...prev.creditCards, newCard],
      lastUpdated: Date.now(),
    }));
  }, []);

  const deleteCreditCard = useCallback((cardId: string) => {
    triggerHaptic('medium');
    setData(prev => ({
      ...prev,
      creditCards: prev.creditCards.filter(c => c.id !== cardId),
      fixedExpenses: prev.fixedExpenses.map(f => {
        if (f.creditCardId === cardId) {
          return { ...f, paymentMethod: 'cash_debit' as PaymentMethod, creditCardId: undefined };
        }
        return f;
      }),
      installmentPurchases: (prev.installmentPurchases || []).filter(ip => ip.creditCardId !== cardId),
      lastUpdated: Date.now(),
    }));
  }, []);

  // Abono a la tarjeta (mantiene registro individual y puede debitar del disponible en ARS o USD)
  const recordCardPayment = useCallback((
    cardId: string, 
    amount: number, 
    deductFromAccount: boolean, 
    note?: string, 
    currency: Currency = 'ARS'
  ) => {
    triggerHaptic('success');
    setData(prev => {
      const card = prev.creditCards.find(c => c.id === cardId);
      const cardName = card ? card.name : 'Tarjeta';
      const todayIso = new Date().toISOString().split('T')[0];
      const paymentId = 'pay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      let expenseId: string | undefined;

      let updatedExpenses = prev.expenses;
      if (deductFromAccount) {
        expenseId = 'exp-card-pay-' + Date.now();
        const paymentExpense: Expense = {
          id: expenseId,
          amount: amount,
          category: 'servicios',
          paymentMethod: 'cash_debit',
          currency,
          note: note?.trim() 
            ? `Pago ${currency} de ${cardName}: ${note.trim()}` 
            : `Pago de resumen ${currency} ${cardName}`,
          date: todayIso,
          createdAt: Date.now(),
        };
        updatedExpenses = [paymentExpense, ...prev.expenses];
      }

      const newPayment: CardPayment = {
        id: paymentId,
        amount,
        date: todayIso,
        note: note?.trim() || undefined,
        createdAt: Date.now(),
        expenseId,
        deductedFromCash: deductFromAccount,
        currency,
      };
      
      const updatedCards = prev.creditCards.map(c => {
        if (c.id !== cardId) return c;
        const currentPayments = Array.isArray(c.payments) ? c.payments : [];
        if (currency === 'USD') {
          return {
            ...c,
            amountPaidUSD: (c.amountPaidUSD || 0) + amount,
            payments: [newPayment, ...currentPayments],
          };
        } else {
          return {
            ...c,
            amountPaid: (c.amountPaid || 0) + amount,
            payments: [newPayment, ...currentPayments],
          };
        }
      });

      return {
        ...prev,
        creditCards: updatedCards,
        expenses: updatedExpenses,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  // Eliminar un pago individual registrado
  const deleteCardPayment = useCallback((cardId: string, paymentId: string) => {
    triggerHaptic('medium');
    setData(prev => {
      const card = prev.creditCards.find(c => c.id === cardId);
      if (!card) return prev;

      const currentPayments = Array.isArray(card.payments) ? card.payments : [];
      const paymentToDelete = currentPayments.find(p => p.id === paymentId);
      if (!paymentToDelete) return prev;

      const remainingPayments = currentPayments.filter(p => p.id !== paymentId);
      const isUSD = paymentToDelete.currency === 'USD';

      let updatedExpenses = prev.expenses;
      if (paymentToDelete.expenseId) {
        updatedExpenses = prev.expenses.filter(e => e.id !== paymentToDelete.expenseId);
      }

      return {
        ...prev,
        creditCards: prev.creditCards.map(c => {
          if (c.id !== cardId) return c;
          if (isUSD) {
            return {
              ...c,
              amountPaidUSD: Math.max(0, (c.amountPaidUSD || 0) - paymentToDelete.amount),
              payments: remainingPayments,
            };
          } else {
            return {
              ...c,
              amountPaid: Math.max(0, (c.amountPaid || 0) - paymentToDelete.amount),
              payments: remainingPayments,
            };
          }
        }),
        expenses: updatedExpenses,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  // Modificar/Editar el monto de un pago cargado
  const editCardPayment = useCallback((cardId: string, paymentId: string, newAmount: number, newNote?: string) => {
    triggerHaptic('success');
    setData(prev => {
      const card = prev.creditCards.find(c => c.id === cardId);
      if (!card) return prev;

      const currentPayments = Array.isArray(card.payments) ? card.payments : [];
      const targetPayment = currentPayments.find(p => p.id === paymentId);
      if (!targetPayment) return prev;

      const diff = newAmount - targetPayment.amount;
      const isUSD = targetPayment.currency === 'USD';

      const updatedPayments = currentPayments.map(p => {
        if (p.id !== paymentId) return p;
        return {
          ...p,
          amount: newAmount,
          note: newNote !== undefined ? newNote.trim() : p.note,
        };
      });

      let updatedExpenses = prev.expenses;
      if (targetPayment.expenseId) {
        updatedExpenses = prev.expenses.map(e => {
          if (e.id !== targetPayment.expenseId) return e;
          return {
            ...e,
            amount: newAmount,
            note: newNote?.trim() ? `Pago de ${card.name}: ${newNote.trim()}` : e.note,
          };
        });
      }

      return {
        ...prev,
        creditCards: prev.creditCards.map(c => {
          if (c.id !== cardId) return c;
          if (isUSD) {
            return {
              ...c,
              amountPaidUSD: Math.max(0, (c.amountPaidUSD || 0) + diff),
              payments: updatedPayments,
            };
          } else {
            return {
              ...c,
              amountPaid: Math.max(0, (c.amountPaid || 0) + diff),
              payments: updatedPayments,
            };
          }
        }),
        expenses: updatedExpenses,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  // Modificar manualmente el total abonado directo
  const setCardAmountPaidDirect = useCallback((cardId: string, directAmount: number, currency: Currency = 'ARS') => {
    triggerHaptic('success');
    const safeAmount = Math.max(0, directAmount);
    setData(prev => ({
      ...prev,
      creditCards: prev.creditCards.map(c => {
        if (c.id !== cardId) return c;
        if (currency === 'USD') {
          return {
            ...c,
            amountPaidUSD: safeAmount,
          };
        }
        return {
          ...c,
          amountPaid: safeAmount,
          payments: safeAmount === 0 ? [] : (c.payments || []),
        };
      }),
      lastUpdated: Date.now(),
    }));
  }, []);

  // Reiniciar a estrictamente $0 el monto abonado y borrar todos los pagos individuales
  const resetCardPayments = useCallback((cardId: string) => {
    triggerHaptic('medium');
    setData(prev => ({
      ...prev,
      creditCards: prev.creditCards.map(c => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          amountPaid: 0,
          amountPaidUSD: 0,
          payments: [],
        };
      }),
      lastUpdated: Date.now(),
    }));
  }, []);

  // Conciliar tarjeta: actualizar el total del resumen en ARS o USD
  const reconcileCard = useCallback((cardId: string, newTotal: number, currency: Currency = 'ARS') => {
    triggerHaptic('success');
    setData(prev => ({
      ...prev,
      creditCards: prev.creditCards.map(c => {
        if (c.id !== cardId) return c;
        if (currency === 'USD') {
          return {
            ...c,
            statementBalanceUSD: Math.max(0, newTotal),
          };
        }
        return {
          ...c,
          statementBalance: Math.max(0, newTotal),
        };
      }),
      lastUpdated: Date.now(),
    }));
  }, []);

  // Backups
  const exportBackup = useCallback(() => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `finanflow-backup-${selectedPeriod}-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerHaptic('success');
  }, [data, selectedPeriod]);

  const importBackup = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.expenses) && Array.isArray(parsed.fixedExpenses)) {
        if (!Array.isArray(parsed.installmentPurchases)) {
          parsed.installmentPurchases = [];
        }
        setData(parsed);
        triggerHaptic('success');
        return true;
      }
    } catch (e) {
      console.error('Invalid backup format', e);
    }
    return false;
  }, []);

  const resetToDefault = useCallback(() => {
    try {
      localStorage.removeItem('finanflow_initialized');
    } catch {}
    const seed = getInitialSeedData(selectedPeriod);
    setData(seed);
    triggerHaptic('medium');
  }, [selectedPeriod]);

  const clearAll = useCallback(() => {
    setData({
      currencySymbol: '$',
      incomes: [],
      expenses: [],
      fixedExpenses: [],
      creditCards: [],
      installmentPurchases: [],
      usdInitialBalance: 0,
      lastUpdated: Date.now(),
    });
    triggerHaptic('medium');
  }, []);

  const startCleanSlate = useCallback(() => {
    triggerHaptic('medium');
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('finanflow_initialized', 'true');
        
        // Remove all period storage keys
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith(STORAGE_PREFIX) || key === LEGACY_STORAGE_KEY)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        const cleanData: FinanceData = {
          currencySymbol: '$',
          incomes: [],
          expenses: [],
          fixedExpenses: [],
          creditCards: [],
          installmentPurchases: [],
          usdInitialBalance: 0,
          lastUpdated: Date.now(),
        };

        localStorage.setItem(`${STORAGE_PREFIX}${currentPeriodKey}`, JSON.stringify(cleanData));
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(cleanData));
        localStorage.setItem(PERIODS_INDEX_KEY, JSON.stringify([currentPeriodKey]));

        setData(cleanData);
        setSelectedPeriod(currentPeriodKey);
        setPeriodsIndex([currentPeriodKey]);
      }
    } catch (e) {
      console.error('Error starting clean slate in useFinanceStore', e);
    }
  }, [currentPeriodKey]);

  const setCurrencySymbol = useCallback((symbol: string) => {
    setData(prev => ({
      ...prev,
      currencySymbol: symbol,
      lastUpdated: Date.now(),
    }));
  }, []);

  const setUsdInitialBalance = useCallback((balance: number) => {
    triggerHaptic('success');
    setData(prev => ({
      ...prev,
      usdInitialBalance: Math.max(0, balance),
      lastUpdated: Date.now(),
    }));
  }, []);

  // Función Rápida: Cambiar / Vender USD a Pesos
  const exchangeUsdToArs = useCallback((payload: {
    usdAmount: number;
    arsAmount: number;
    date?: string;
    note?: string;
  }) => {
    triggerHaptic('success');
    const todayIso = payload.date || new Date().toISOString().split('T')[0];
    const formattedUsd = new Intl.NumberFormat('es-AR').format(payload.usdAmount);
    const formattedArs = new Intl.NumberFormat('es-AR').format(payload.arsAmount);

    // 1. Gasto / salida en USD (descuenta de la caja USD disponible)
    const usdExpense: Expense = {
      id: 'exp-usd-sale-' + Date.now(),
      amount: payload.usdAmount,
      category: 'otros',
      paymentMethod: 'cash_debit',
      currency: 'USD',
      note: payload.note?.trim() 
        ? `Cambio de USD: ${payload.note.trim()} (Recibido: $ ${formattedArs})`
        : `Venta / Cambio a Pesos (Recibido: $ ${formattedArs})`,
      date: todayIso,
      createdAt: Date.now(),
    };

    // 2. Ingreso en ARS con concepto "Venta / Cambio de USD"
    const arsIncome: Income = {
      id: 'inc-usd-sale-' + Date.now(),
      amount: payload.arsAmount,
      source: 'Venta / Cambio de USD',
      currency: 'ARS',
      note: `Venta de US$ ${formattedUsd}`,
      date: todayIso,
      createdAt: Date.now() + 1,
    };

    setData(prev => ({
      ...prev,
      expenses: [usdExpense, ...prev.expenses],
      incomes: [arsIncome, ...prev.incomes],
      lastUpdated: Date.now(),
    }));
  }, []);

  // Computed Key Financial Metrics
  const calculations = useMemo(() => {
    // Ingresos en ARS (Pesos)
    const totalIncome = data.incomes
      .filter(inc => (inc.currency || 'ARS') === 'ARS')
      .reduce((acc, inc) => acc + inc.amount, 0);

    // Gastos en ARS que descuentan inmediatamente de la cuenta / efectivo
    const totalCashDebitExpenses = data.expenses
      .filter(exp => (exp.currency || 'ARS') === 'ARS' && exp.paymentMethod === 'cash_debit')
      .reduce((acc, exp) => acc + exp.amount, 0);

    // Fijos ya pagados en ARS (excluye débitos automáticos en tarjeta)
    const totalFixedPaid = data.fixedExpenses
      .filter(f => (f.currency || 'ARS') === 'ARS' && f.paymentMethod !== 'credit_card' && f.isPaid)
      .reduce((acc, f) => acc + f.amount, 0);

    // Total gastado del mes en efectivo / debito disponible en ARS
    const totalGastadoEfectivoMes = totalCashDebitExpenses + totalFixedPaid;

    // Saldo Neto Disponible hoy en ARS
    const saldoNetoDisponible = totalIncome - totalGastadoEfectivoMes;

    // Fijos aún pendientes en ARS (excluye débitos automáticos en tarjeta)
    const totalFixedPending = data.fixedExpenses
      .filter(f => (f.currency || 'ARS') === 'ARS' && f.paymentMethod !== 'credit_card' && !f.isPaid)
      .reduce((acc, f) => acc + f.amount, 0);

    // Deuda pendiente de tarjetas según resumen (Total resumen - Abonado) en ARS
    const cardDebtPending = data.creditCards.reduce((acc, card) => {
      const pending = Math.max(0, card.statementBalance - card.amountPaid);
      return acc + pending;
    }, 0);

    // Deuda pendiente de tarjetas según resumen en USD
    const cardDebtPendingUSD = data.creditCards.reduce((acc, card) => {
      const pending = Math.max(0, (card.statementBalanceUSD || 0) - (card.amountPaidUSD || 0));
      return acc + pending;
    }, 0);

    // Total pendiente de pago = Fijos pendientes + Tarjetas pendientes (ARS)
    const totalPendienteDePago = totalFixedPending + cardDebtPending;

    // Consumos anotados en tarjetas este mes en ARS (gastos diarios + débitos automáticos + cuotas activas)
    const trackedCardExpensesByCard: Record<string, number> = {};
    let totalTrackedCardExpenses = 0;
    
    // 1. Gastos diarios con tarjeta en ARS
    data.expenses.forEach(exp => {
      if ((exp.currency || 'ARS') === 'ARS' && exp.paymentMethod === 'credit_card') {
        totalTrackedCardExpenses += exp.amount;
        if (exp.creditCardId) {
          trackedCardExpensesByCard[exp.creditCardId] = (trackedCardExpensesByCard[exp.creditCardId] || 0) + exp.amount;
        }
      }
    });

    // 2. Gastos fijos adheridos a débito automático en ARS
    data.fixedExpenses.forEach(fix => {
      if ((fix.currency || 'ARS') === 'ARS' && fix.paymentMethod === 'credit_card') {
        totalTrackedCardExpenses += fix.amount;
        if (fix.creditCardId) {
          trackedCardExpensesByCard[fix.creditCardId] = (trackedCardExpensesByCard[fix.creditCardId] || 0) + fix.amount;
        }
      }
    });

    // 3. Compras en cuotas activas este mes en ARS (solo computa la cuota del período)
    (data.installmentPurchases || []).forEach(ip => {
      if ((ip.currency || 'ARS') === 'ARS' && ip.currentInstallment <= ip.totalInstallments) {
        totalTrackedCardExpenses += ip.installmentAmount;
        if (ip.creditCardId) {
          trackedCardExpensesByCard[ip.creditCardId] = 
            (trackedCardExpensesByCard[ip.creditCardId] || 0) + ip.installmentAmount;
        }
      }
    });

    // --- CÁLCULOS PARALELOS EN DÓLARES (USD) ---
    // Ingresos registrados en USD
    const totalIncomeUSD = data.incomes
      .filter(inc => inc.currency === 'USD')
      .reduce((acc, inc) => acc + inc.amount, 0);

    // Gastos en efectivo / débito registrados en USD
    const totalCashDebitExpensesUSD = data.expenses
      .filter(exp => exp.currency === 'USD' && exp.paymentMethod === 'cash_debit')
      .reduce((acc, exp) => acc + exp.amount, 0);

    // Gastos fijos pagados en USD (excluye débitos en tarjeta)
    const totalFixedPaidUSD = data.fixedExpenses
      .filter(f => f.currency === 'USD' && f.paymentMethod !== 'credit_card' && f.isPaid)
      .reduce((acc, f) => acc + f.amount, 0);

    // Gastos fijos pendientes en USD (excluye débitos en tarjeta)
    const totalFixedPendingUSD = data.fixedExpenses
      .filter(f => f.currency === 'USD' && f.paymentMethod !== 'credit_card' && !f.isPaid)
      .reduce((acc, f) => acc + f.amount, 0);

    // Consumos anotados en tarjetas este mes en USD (gastos diarios + débitos automáticos + cuotas activas USD)
    const trackedCardExpensesUSDByCard: Record<string, number> = {};
    let totalTrackedCardExpensesUSD = 0;

    data.expenses.forEach(exp => {
      if (exp.currency === 'USD' && exp.paymentMethod === 'credit_card') {
        totalTrackedCardExpensesUSD += exp.amount;
        if (exp.creditCardId) {
          trackedCardExpensesUSDByCard[exp.creditCardId] = (trackedCardExpensesUSDByCard[exp.creditCardId] || 0) + exp.amount;
        }
      }
    });

    data.fixedExpenses.forEach(fix => {
      if (fix.currency === 'USD' && fix.paymentMethod === 'credit_card') {
        totalTrackedCardExpensesUSD += fix.amount;
        if (fix.creditCardId) {
          trackedCardExpensesUSDByCard[fix.creditCardId] = (trackedCardExpensesUSDByCard[fix.creditCardId] || 0) + fix.amount;
        }
      }
    });

    (data.installmentPurchases || []).forEach(ip => {
      if (ip.currency === 'USD' && ip.currentInstallment <= ip.totalInstallments) {
        totalTrackedCardExpensesUSD += ip.installmentAmount;
        if (ip.creditCardId) {
          trackedCardExpensesUSDByCard[ip.creditCardId] = 
            (trackedCardExpensesUSDByCard[ip.creditCardId] || 0) + ip.installmentAmount;
        }
      }
    });

    // Total gastado en USD de caja / efectivo disponible
    const totalGastadoUSD = totalCashDebitExpensesUSD + totalFixedPaidUSD;

    // Disponible Neto en USD
    const disponibleUSD = (data.usdInitialBalance || 0) + totalIncomeUSD - totalGastadoUSD;

    // Cálculo del ritmo sugerido de gasto diario (Widget de Ritmo de Gasto)
    // [Saldo Neto Disponible actual en ARS] ÷ [Días restantes para finalizar el mes en curso]
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1); // incluye hoy
    const suggestedDailyPace = saldoNetoDisponible > 0 ? Math.round(saldoNetoDisponible / daysRemaining) : 0;

    return {
      totalIncome,
      totalCashDebitExpenses,
      totalFixedPaid,
      totalGastadoEfectivoMes,
      saldoNetoDisponible,
      totalFixedPending,
      cardDebtPending,
      cardDebtPendingUSD,
      totalPendienteDePago,
      totalTrackedCardExpenses,
      trackedCardExpensesByCard,
      // USD metrics
      totalIncomeUSD,
      totalGastadoUSD,
      totalFixedPendingUSD,
      disponibleUSD,
      totalTrackedCardExpensesUSD,
      trackedCardExpensesUSDByCard,
      // Daily pace metrics
      daysRemaining,
      suggestedDailyPace,
    };
  }, [data]);

  return {
    data,
    calculations,
    currentPeriodKey,
    selectedPeriod,
    periodsIndex,
    isViewingHistory,
    switchPeriod,
    returnToCurrentPeriod,
    addExpense,
    deleteExpense,
    addIncome,
    deleteIncome,
    updateIncome,
    toggleFixedExpense,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    resetNewMonth,
    updateCreditCard,
    updateCardMinPayment,
    addCreditCard,
    deleteCreditCard,
    recordCardPayment,
    deleteCardPayment,
    editCardPayment,
    setCardAmountPaidDirect,
    resetCardPayments,
    reconcileCard,
    addInstallmentPurchase,
    updateInstallmentPurchase,
    deleteInstallmentPurchase,
    advanceInstallmentPurchase,
    exportBackup,
    importBackup,
    resetToDefault,
    clearAll,
    startCleanSlate,
    setCurrencySymbol,
    setUsdInitialBalance,
    exchangeUsdToArs,
    privacyMode,
    togglePrivacyMode,
  };
}
