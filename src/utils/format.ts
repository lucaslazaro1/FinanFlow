import { Currency } from '../types/finance';

let _privacyMode = false;
try {
  _privacyMode = typeof localStorage !== 'undefined' && localStorage.getItem('finanflow_privacy_mode') === 'true';
} catch {
  _privacyMode = false;
}

export function getGlobalPrivacyMode(): boolean {
  return _privacyMode;
}

export function setGlobalPrivacyMode(val: boolean) {
  _privacyMode = val;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('finanflow_privacy_mode', String(val));
    }
  } catch {}
}

export function formatMoney(amount: number, symbol: string = '$', forcedPrivacy?: boolean): string {
  const isPrivate = forcedPrivacy !== undefined ? forcedPrivacy : _privacyMode;
  if (isPrivate) {
    const isNegative = typeof amount === 'number' && amount < 0;
    return `${isNegative ? '-' : ''}${symbol} ••••••`;
  }

  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol}0`;
  }
  
  // Format with thousands separator
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(absAmount);

  return `${isNegative ? '-' : ''}${symbol} ${formatted}`;
}

export function formatCurrency(amount: number, currency: Currency = 'ARS', forcedPrivacy?: boolean): string {
  const symbol = currency === 'USD' ? 'US$' : '$';
  return formatMoney(amount, symbol, forcedPrivacy);
}

export function formatDateSpanish(dateIso: string): string {
  if (!dateIso) return '';
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayIso = `${year}-${month}-${day}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateIso === todayIso) return 'Hoy';
  if (dateIso === yesterdayIso) return 'Ayer';

  try {
    const [y, m, d] = dateIso.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateIso;
  }
}

export interface DueStatus {
  status: 'danger' | 'warning' | 'ok';
  daysLeft: number;
  label: string;
}

export function getTrafficLightStatus(dueDay: number): DueStatus {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Create date for this month's due day
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const targetDay = Math.min(dueDay, daysInMonth);
  const dueDate = new Date(currentYear, currentMonth, targetDay);

  // If due day has already passed this month, compute next month
  let diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (targetDay < currentDay) {
    // Already passed or today
    const diffPast = currentDay - targetDay;
    if (diffPast === 0) {
      return {
        status: 'danger',
        daysLeft: 0,
        label: 'Vence Hoy',
      };
    }
    return {
      status: 'danger',
      daysLeft: -diffPast,
      label: `Venció hace ${diffPast}d`,
    };
  }

  if (diffDays <= 2) {
    return {
      status: 'danger',
      daysLeft: diffDays,
      label: diffDays === 1 ? 'Vence mañana' : `Vence en ${diffDays} días`,
    };
  } else if (diffDays <= 5) {
    return {
      status: 'warning',
      daysLeft: diffDays,
      label: `Vence en ${diffDays} días`,
    };
  } else {
    return {
      status: 'ok',
      daysLeft: diffDays,
      label: `Día ${dueDay} (${diffDays} días)`,
    };
  }
}

export function formatPeriodSpanish(periodKey: string): string {
  try {
    const [y, m] = periodKey.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    const name = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date);
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return periodKey;
  }
}

/**
 * Blocks letters and invalid characters from monetary amount inputs.
 * Accepts exclusively digits and at most one decimal separator (comma or dot).
 */
export function filterNumericInput(val: string): string {
  if (!val) return '';
  // Keep only digits, dots, and commas
  let clean = val.replace(/[^0-9.,]/g, '');

  // Allow only one decimal separator (the first one encountered)
  const firstSep = clean.search(/[.,]/);
  if (firstSep !== -1) {
    const head = clean.slice(0, firstSep + 1);
    const tail = clean.slice(firstSep + 1).replace(/[.,]/g, '');
    clean = head + tail;
  }
  return clean;
}

/**
 * Prevents non-numeric keystrokes on physical or virtual keyboards.
 * Allows control keys (Backspace, Delete, arrows, Enter, Tab, etc.) and shortcuts (Ctrl/Cmd).
 */
export function handleNumericKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (
    ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key) ||
    e.ctrlKey ||
    e.metaKey
  ) {
    return;
  }
  if (!/^[0-9.,]$/.test(e.key)) {
    e.preventDefault();
  }
}

/**
 * Formats full date and exact time in Spanish for detail modals.
 */
export function formatFullDateTimeSpanish(timestamp: number, dateIso?: string): { dateStr: string; timeStr: string } {
  try {
    let dateObj = timestamp ? new Date(timestamp) : (dateIso ? new Date(dateIso + 'T12:00:00') : new Date());
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }

    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    const rawDateStr = new Intl.DateTimeFormat('es-AR', dateOptions).format(dateObj);
    const dateStr = rawDateStr.charAt(0).toUpperCase() + rawDateStr.slice(1);

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    const timeStr = new Intl.DateTimeFormat('es-AR', timeOptions).format(dateObj) + ' hs';

    return { dateStr, timeStr };
  } catch {
    return { dateStr: dateIso || '', timeStr: '' };
  }
}

/**
 * Formats a day of month with abbreviated month name (e.g. '20 Sep' or '05 Oct').
 * If isDue is true and dueDay < closingDay, shifts to the following month.
 */
export function formatCardDayMonth(day: number | undefined, isDue: boolean = false, closingDay?: number): string {
  if (!day) return '-';
  const now = new Date();
  let month = now.getMonth();
  if (isDue && closingDay && day < closingDay) {
    month = (month + 1) % 12;
  }
  const date = new Date(now.getFullYear(), month, Math.min(day, 28));
  try {
    const rawMonth = new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(date);
    const cleanMonth = rawMonth.replace('.', '').trim();
    const capitalizedMonth = cleanMonth.charAt(0).toUpperCase() + cleanMonth.slice(1);
    const formattedDay = String(day).padStart(2, '0');
    return `${formattedDay} ${capitalizedMonth}`;
  } catch {
    return `${day}`;
  }
}

/**
 * Formats display date for card closing / due date using exact ISO date if available, or fallback day.
 */
export function formatCardDisplayDate(dateIso?: string, dayFallback?: number, isDue: boolean = false, closingDay?: number): string {
  if (dateIso) {
    try {
      const parts = dateIso.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        const rawMonth = new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(date);
        const cleanMonth = rawMonth.replace('.', '').trim();
        const capitalizedMonth = cleanMonth.charAt(0).toUpperCase() + cleanMonth.slice(1);
        const formattedDay = String(day).padStart(2, '0');
        return `${formattedDay} ${capitalizedMonth}`;
      }
    } catch {}
  }
  return formatCardDayMonth(dayFallback, isDue, closingDay);
}

/**
 * Computes remaining days until a specific day of the month (0 = today, 1 = tomorrow).
 * Takes into account if the day has already passed this month and rolls over to next month.
 */
export function getDaysUntilDay(day?: number): number | null {
  if (!day || day < 1 || day > 31) return null;
  const now = new Date();
  const currentDay = now.getDate();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const actualDay = Math.min(day, daysInCurrentMonth);

  let target = new Date(currentYear, currentMonth, actualDay);
  if (actualDay < currentDay) {
    // Already passed this month, target is next month
    const nextMonthDays = new Date(currentYear, currentMonth + 2, 0).getDate();
    target = new Date(currentYear, currentMonth + 1, Math.min(day, nextMonthDays));
  }

  const todayReset = new Date(currentYear, currentMonth, currentDay);
  const diffTime = target.getTime() - todayReset.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Computes difference in days from today to a date (ISO YYYY-MM-DD or day fallback).
 * Returns negative if past/overdue, 0 if today, positive if future days.
 */
export function getDaysUntilDate(dateIso?: string, dayFallback?: number): number | null {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const todayReset = new Date(currentYear, currentMonth, currentDay);

  if (dateIso) {
    try {
      const parts = dateIso.split('-');
      if (parts.length === 3) {
        const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(target.getTime())) {
          const diffTime = target.getTime() - todayReset.getTime();
          return Math.round(diffTime / (1000 * 60 * 60 * 24));
        }
      }
    } catch {}
  }

  if (dayFallback && dayFallback >= 1 && dayFallback <= 31) {
    return getDaysUntilDay(dayFallback);
  }

  return null;
}
