/**
 * Utility to generate and download standard .ics (iCalendar) files.
 * Works natively on iOS (iPhone / iPad), Android, and desktop browsers.
 */

export interface CalendarEventPayload {
  title: string;
  dueDay?: number;
  dueDateIso?: string; // YYYY-MM-DD
  amount: number;
  currency?: string;
  additionalNote?: string;
}

export function downloadDueCalendarEvent(payload: CalendarEventPayload) {
  let eventYear: number;
  let eventMonth: number;
  let eventDay: number;

  if (payload.dueDateIso) {
    const parts = payload.dueDateIso.split('-');
    eventYear = parseInt(parts[0], 10);
    eventMonth = parseInt(parts[1], 10) - 1;
    eventDay = parseInt(parts[2], 10);
  } else {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const targetDay = Math.min(Math.max(1, payload.dueDay || 10), 31);
    
    eventYear = year;
    eventMonth = month;
    if (now.getDate() > targetDay) {
      eventMonth = month + 1;
      if (eventMonth > 11) {
        eventMonth = 0;
        eventYear += 1;
      }
    }
    const daysInTargetMonth = new Date(eventYear, eventMonth + 1, 0).getDate();
    eventDay = Math.min(targetDay, daysInTargetMonth);
  }
  const eventDate = new Date(eventYear, eventMonth, eventDay);
  
  // Format dates as YYYYMMDD
  const yyyy = eventDate.getFullYear();
  const mm = String(eventDate.getMonth() + 1).padStart(2, '0');
  const dd = String(eventDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  // Full day event: next day DTEND
  const nextDate = new Date(eventDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextYyyy = nextDate.getFullYear();
  const nextMm = String(nextDate.getMonth() + 1).padStart(2, '0');
  const nextDd = String(nextDate.getDate()).padStart(2, '0');
  const nextDateStr = `${nextYyyy}${nextMm}${nextDd}`;

  const curr = payload.currency === 'USD' ? 'US$' : '$';
  const amountFormatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(payload.amount));
  
  const summary = `Vencimiento: ${payload.title}`;
  let description = `Monto a abonar: ${curr} ${amountFormatted}`;
  if (payload.additionalNote) {
    description += `\\n${payload.additionalNote}`;
  }

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FinanFlow//Vencimientos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:finanflow-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@finanflow.app`,
    `DTSTAMP:${dateStr}T090000Z`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${nextDateStr}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const icsContent = icsLines.join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanFileName = payload.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  a.download = `vencimiento-${cleanFileName || 'servicio'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
