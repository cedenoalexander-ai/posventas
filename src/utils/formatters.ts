export function formatearBS(monto: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(monto || 0)
    .replace('VES', 'Bs.');
}

export function formatearUSD(monto: number): string {
  return `$${Number(monto || 0).toFixed(2)}`;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  ene: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  ago: 7,
  sep: 8,
  set: 8,
  oct: 9,
  nov: 10,
  dec: 11,
  dic: 11,
};

export function parsearCualquierFecha(
  fechaOriginal: string | Date | undefined | null
): Date | null {
  if (!fechaOriginal) return null;
  if (fechaOriginal instanceof Date) {
    return isNaN(fechaOriginal.getTime()) ? null : fechaOriginal;
  }

  const str = String(fechaOriginal).trim();
  if (!str || str === 'N/A' || str === 'null' || str === 'undefined') return null;

  // 1. Check DD/MM/YYYY or DD-MM-YYYY (e.g. "31/08/2026" or "31/08/2026 14:30:00" or "31/08/2026, 11:27:00 a. m.")
  const matchLatina = str.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s*[,]?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*([ap]\.?\s*m\.?))?)?/i
  );
  if (matchLatina) {
    const day = parseInt(matchLatina[1], 10);
    const month = parseInt(matchLatina[2], 10) - 1;
    const year = parseInt(matchLatina[3], 10);
    let hours = matchLatina[4] ? parseInt(matchLatina[4], 10) : 0;
    const minutes = matchLatina[5] ? parseInt(matchLatina[5], 10) : 0;
    const seconds = matchLatina[6] ? parseInt(matchLatina[6], 10) : 0;
    const ampm = matchLatina[7]
      ? matchLatina[7].toLowerCase().replace(/\./g, '').trim()
      : '';

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    return new Date(year, month, day, hours, minutes, seconds);
  }

  // 2. Check ISO format YYYY-MM-DD (e.g. "2026-08-31" or "2026-08-31T03:27:00.000Z")
  const matchISO = str.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d+))?(?:Z|([+\-]\d{2}:?\d{2}))?)?/i
  );
  if (matchISO) {
    // If it is just YYYY-MM-DD without time, create local date to avoid timezone shift
    if (!matchISO[4]) {
      return new Date(
        parseInt(matchISO[1], 10),
        parseInt(matchISO[2], 10) - 1,
        parseInt(matchISO[3], 10)
      );
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Check English/GAS Date format: e.g. "Sun Aug 30 2026 23:27:00 GMT-0400 (hora de Venezuela)"
  // Clean timezone descriptions in parenthesis
  const cleaned = str.replace(/\s*\([^)]*\)/g, '').trim();

  const matchGAS = cleaned.match(
    /(?:[A-Za-z]{3}\s+)?([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?(?:\s+GMT([+\-]\d{2})(\d{2})?)?/i
  );
  if (matchGAS) {
    const monStr = matchGAS[1].toLowerCase();
    const month = MONTH_MAP[monStr] !== undefined ? MONTH_MAP[monStr] : 0;
    const day = parseInt(matchGAS[2], 10);
    const year = parseInt(matchGAS[3], 10);
    const hours = matchGAS[4] ? parseInt(matchGAS[4], 10) : 0;
    const minutes = matchGAS[5] ? parseInt(matchGAS[5], 10) : 0;
    const seconds = matchGAS[6] ? parseInt(matchGAS[6], 10) : 0;

    // Special fix for Google Apps Script Venezuela / historical timezone offset:
    // If hours is 23 and minutes >= 20 (e.g. 23:27:00 or 23:30:00) with GMT-0400,
    // Google Sheets entered midnight of the next day, which shifted by -33 mins.
    if (hours >= 23 && minutes >= 20) {
      const dTemp = new Date(year, month, day, 0, 0, 0);
      dTemp.setDate(dTemp.getDate() + 1);
      return dTemp;
    }

    return new Date(year, month, day, hours, minutes, seconds);
  }

  // Standard fallback
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    if (d.getHours() >= 23 && d.getMinutes() >= 20) {
      const dFixed = new Date(d);
      dFixed.setDate(dFixed.getDate() + 1);
      dFixed.setHours(0, 0, 0, 0);
      return dFixed;
    }
    return d;
  }

  return null;
}

export function formatearFechaCorta(
  fechaOriginal: string | Date | undefined | null
): string {
  if (!fechaOriginal || fechaOriginal === 'N/A') return 'N/A';
  const d = parsearCualquierFecha(fechaOriginal);
  if (!d) return String(fechaOriginal);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

export function formatearFechaLatina(
  fechaOriginal: string | Date | undefined | null
): string {
  if (!fechaOriginal || fechaOriginal === 'N/A') return 'N/A';
  const d = parsearCualquierFecha(fechaOriginal);
  if (!d) return String(fechaOriginal);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();

  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
    return `${dia}/${mes}/${anio}`;
  }

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hoursStr = String(hours).padStart(2, '0');

  return `${dia}/${mes}/${anio} ${hoursStr}:${minutes} ${ampm}`;
}

export function parsearFechaVenta(fechaStr?: string): Date | null {
  return parsearCualquierFecha(fechaStr);
}

export function esFechaDeHoy(fechaStr?: string | Date): boolean {
  if (!fechaStr) return false;
  const fv = parsearCualquierFecha(fechaStr);
  if (!fv) return false;
  const hoy = new Date();
  return (
    fv.getFullYear() === hoy.getFullYear() &&
    fv.getMonth() === hoy.getMonth() &&
    fv.getDate() === hoy.getDate()
  );
}

export function normalizarId(id?: string | number): string {
  if (id === null || id === undefined) return '';
  const s = id.toString().trim();
  const numOnly = s.replace(/\D/g, '');
  return numOnly ? parseInt(numOnly, 10).toString() : s.toLowerCase();
}
