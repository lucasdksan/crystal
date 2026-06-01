import { describe, expect, it } from "vitest";
import {
  calendarDateToVtexIso,
  formatCalendarDatePtBr,
  getQuickRangeDays,
  validateDateRange,
} from "@/frontend/lib/vtex-dates";

describe("vtex-dates", () => {
  it("converts calendar start date to UTC midnight ISO", () => {
    const iso = calendarDateToVtexIso("2026-04-01", "start");
    expect(iso).toBe("2026-04-01T00:00:00.000Z");
  });

  it("converts calendar end date to UTC end-of-day ISO", () => {
    const iso = calendarDateToVtexIso("2026-06-30", "end");
    expect(iso).toBe("2026-06-30T23:59:59.999Z");
  });

  it("formats date for pt-BR display", () => {
    expect(formatCalendarDatePtBr("2026-04-01")).toBe("01/04/2026");
    expect(formatCalendarDatePtBr("2026-06-30")).toBe("30/06/2026");
  });

  it("validates that start is not after end", () => {
    expect(validateDateRange("2026-06-30", "2026-04-01")).toMatch(
      /anterior ou igual/,
    );
    expect(validateDateRange("2026-04-01", "2026-06-30")).toBeNull();
  });

  it("getQuickRangeDays returns ISO bounds", () => {
    const range = getQuickRangeDays(30);
    expect(range.startDate).toMatch(/T00:00:00\.000Z$/);
    expect(range.endDate).toMatch(/T23:59:59\.999Z$/);
  });
});
