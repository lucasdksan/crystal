/** VTEX OMS rejects milliseconds in f_creationDate (expects …T00:00:00Z). */
export function toVtexOmsIso(iso: string): string {
  return iso.replace(/\.\d{3}Z$/, "Z");
}

/** Converte data do calendário (YYYY-MM-DD) para ISO no formato esperado pela VTEX OMS. */
export function calendarDateToVtexIso(
  dateStr: string,
  boundary: "start" | "end",
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Data inválida.");
  }

  if (boundary === "start") {
    return toVtexOmsIso(
      new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString(),
    );
  }

  return toVtexOmsIso(
    new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).toISOString(),
  );
}

/** Formata YYYY-MM-DD para exibição pt-BR (dd/mm/aaaa). */
export function formatCalendarDatePtBr(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function getDefaultEndDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDefaultStartDate(daysBack: number = 30): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

export function getQuickRangeDays(days: number): {
  startDate: string;
  endDate: string;
} {
  const end = getDefaultEndDate();
  const start = getDefaultStartDate(days);
  return {
    startDate: calendarDateToVtexIso(start, "start"),
    endDate: calendarDateToVtexIso(end, "end"),
  };
}

export function validateDateRange(
  startStr: string,
  endStr: string,
): string | null {
  if (!startStr || !endStr) {
    return "Informe a data inicial e a data final.";
  }

  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Datas inválidas.";
  }

  if (start > end) {
    return "A data inicial deve ser anterior ou igual à data final.";
  }

  return null;
}
