import { useState, useEffect, useCallback, useMemo } from 'react';
import { SavingsInstrument, Currency, SavingsType } from '../types/finance';
import { triggerHaptic } from './useFinanceStore';

export const SAVINGS_STORAGE_KEY = 'finanflow_savings_instruments';

// Helper to compute a sample due date 15 days from now
const sampleDue = new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0];
const sampleStart = new Date(Date.now() - 86400000 * 15).toISOString().split('T')[0];

export const INITIAL_SAVINGS_INSTRUMENTS: SavingsInstrument[] = [
  {
    id: 'sav-pf-1',
    name: 'Plazo Fijo Banco Digital (30 días)',
    type: 'plazo_fijo',
    currency: 'ARS',
    currentBalance: 250000,
    initialCapital: 250000,
    tna: 38.0,
    termDays: 30,
    startDate: sampleStart,
    dueDate: sampleDue,
    notes: 'TNA 38% anual - Acredita en cuenta al vencimiento',
    createdAt: Date.now() - 86400000 * 15,
    lastUpdated: Date.now(),
  },
  {
    id: 'sav-1',
    name: 'Fondo de Emergencia',
    type: 'emergency',
    currency: 'ARS',
    currentBalance: 350000,
    notes: '3 meses de gastos esenciales en cuenta remunerada',
    targetAmount: 500000,
    createdAt: Date.now() - 86400000 * 60,
    lastUpdated: Date.now(),
  },
  {
    id: 'sav-2',
    name: 'Billetera Rendimiento Diario',
    type: 'fixed_term',
    currency: 'ARS',
    currentBalance: 180000,
    notes: 'Liquidez inmediata con rendimiento ~35% TNA',
    createdAt: Date.now() - 86400000 * 30,
    lastUpdated: Date.now(),
  },
  {
    id: 'sav-3',
    name: 'Dólares Ahorro / Colchón',
    type: 'cash_usd',
    currency: 'USD',
    currentBalance: 1500,
    notes: 'Reserva física de valor en billetes',
    targetAmount: 3000,
    createdAt: Date.now() - 86400000 * 90,
    lastUpdated: Date.now(),
  },
  {
    id: 'sav-4',
    name: 'Cedears S&P 500 (SPY)',
    type: 'stocks',
    currency: 'USD',
    currentBalance: 850,
    notes: 'Inversión indexada a largo plazo',
    createdAt: Date.now() - 86400000 * 45,
    lastUpdated: Date.now(),
  },
];

export function useSavingsStore() {
  const [instruments, setInstruments] = useState<SavingsInstrument[]>(() => {
    try {
      const isCleanMode = typeof localStorage !== 'undefined' && localStorage.getItem('finanflow_initialized') === 'true';
      const stored = localStorage.getItem(SAVINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      if (isCleanMode) {
        return [];
      }
    } catch (e) {
      console.error('Error loading savings instruments from localStorage:', e);
    }
    return INITIAL_SAVINGS_INSTRUMENTS;
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(SAVINGS_STORAGE_KEY, JSON.stringify(instruments));
    } catch (e) {
      console.error('Error saving savings instruments to localStorage:', e);
    }
  }, [instruments]);

  // Totals calculations
  const totalSavingsARS = useMemo(() => {
    return instruments
      .filter(i => (i.currency || 'ARS') === 'ARS')
      .reduce((sum, i) => sum + (Number(i.currentBalance) || 0), 0);
  }, [instruments]);

  const totalSavingsUSD = useMemo(() => {
    return instruments
      .filter(i => i.currency === 'USD')
      .reduce((sum, i) => sum + (Number(i.currentBalance) || 0), 0);
  }, [instruments]);

  const addInstrument = useCallback((data: {
    name: string;
    type: SavingsType;
    currency: Currency;
    currentBalance: number;
    notes?: string;
    targetAmount?: number;
    tna?: number;
    startDate?: string;
    dueDate?: string;
    termDays?: number;
    initialCapital?: number;
  }) => {
    triggerHaptic('success');
    const newInst: SavingsInstrument = {
      id: 'sav-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: data.name.trim(),
      type: data.type,
      currency: data.currency,
      currentBalance: Math.max(0, data.currentBalance),
      notes: data.notes?.trim() || undefined,
      targetAmount: data.targetAmount && data.targetAmount > 0 ? data.targetAmount : undefined,
      tna: data.tna !== undefined && data.tna > 0 ? data.tna : undefined,
      startDate: data.startDate?.trim() || undefined,
      dueDate: data.dueDate?.trim() || undefined,
      termDays: data.termDays !== undefined && data.termDays > 0 ? data.termDays : undefined,
      initialCapital: data.initialCapital !== undefined && data.initialCapital > 0 ? data.initialCapital : (data.type === 'plazo_fijo' ? Math.max(0, data.currentBalance) : undefined),
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    setInstruments(prev => [newInst, ...prev]);
    return newInst;
  }, []);

  const updateInstrument = useCallback((id: string, updates: Partial<SavingsInstrument>) => {
    triggerHaptic('success');
    setInstruments(prev => prev.map(inst => {
      if (inst.id !== id) return inst;
      return {
        ...inst,
        ...updates,
        name: updates.name !== undefined ? updates.name.trim() : inst.name,
        currentBalance: updates.currentBalance !== undefined ? Math.max(0, updates.currentBalance) : inst.currentBalance,
        notes: updates.notes !== undefined ? (updates.notes.trim() || undefined) : inst.notes,
        tna: updates.tna !== undefined ? updates.tna : inst.tna,
        startDate: updates.startDate !== undefined ? (updates.startDate.trim() || undefined) : inst.startDate,
        dueDate: updates.dueDate !== undefined ? (updates.dueDate.trim() || undefined) : inst.dueDate,
        termDays: updates.termDays !== undefined ? updates.termDays : inst.termDays,
        initialCapital: updates.initialCapital !== undefined ? updates.initialCapital : inst.initialCapital,
        lastUpdated: Date.now(),
      };
    }));
  }, []);

  const deleteInstrument = useCallback((id: string) => {
    triggerHaptic('medium');
    setInstruments(prev => prev.filter(i => i.id !== id));
  }, []);

  const addToFundBalance = useCallback((id: string, amount: number) => {
    triggerHaptic('success');
    setInstruments(prev => prev.map(inst => {
      if (inst.id !== id) return inst;
      const nextBalance = Math.max(0, (inst.currentBalance || 0) + amount);
      return {
        ...inst,
        currentBalance: nextBalance,
        lastUpdated: Date.now(),
      };
    }));
  }, []);

  const subtractFromFundBalance = useCallback((id: string, amount: number) => {
    triggerHaptic('success');
    setInstruments(prev => prev.map(inst => {
      if (inst.id !== id) return inst;
      const nextBalance = Math.max(0, (inst.currentBalance || 0) - amount);
      return {
        ...inst,
        currentBalance: nextBalance,
        lastUpdated: Date.now(),
      };
    }));
  }, []);

  const clearAllSavings = useCallback(() => {
    triggerHaptic('medium');
    setInstruments([]);
    try {
      localStorage.setItem(SAVINGS_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {
      console.error('Error clearing savings instruments', e);
    }
  }, []);

  const resetSavingsToDefault = useCallback(() => {
    triggerHaptic('medium');
    setInstruments(INITIAL_SAVINGS_INSTRUMENTS);
  }, []);

  return {
    instruments,
    totalSavingsARS,
    totalSavingsUSD,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    addToFundBalance,
    subtractFromFundBalance,
    clearAllSavings,
    resetSavingsToDefault,
  };
}
