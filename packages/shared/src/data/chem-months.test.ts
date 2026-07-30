import { describe, it, expect } from "vitest";
import { chemMonthKey, chemMonthLabel, chemMonthsForLogs, chemLogsInMonth } from "./chem-months";

const tz = "America/New_York";
const log = (takenAt: string) => ({ takenAt, recordedAt: takenAt });

describe("chem month grouping (Fix 7)", () => {
  it("keys a reading by its calendar month in the tenant timezone", () => {
    expect(chemMonthKey("2026-07-15T14:00:00Z", tz)).toBe("2026-07");
    // Aug 1 00:30 UTC is still July 31 in New York → July sheet.
    expect(chemMonthKey("2026-08-01T00:30:00Z", tz)).toBe("2026-07");
  });

  it("labels a month key", () => {
    expect(chemMonthLabel("2026-07")).toBe("July 2026");
    expect(chemMonthLabel("2026-08")).toBe("August 2026");
  });

  it("a July reading appears under July; August starts empty but stays selectable", () => {
    const logs = [log("2026-07-05T15:00:00Z"), log("2026-07-20T15:00:00Z")];
    // Pretend "now" is August.
    const months = chemMonthsForLogs(logs, tz, "2026-08");
    expect(months).toEqual(["2026-08", "2026-07"]); // current month present + July, newest first

    expect(chemLogsInMonth(logs, "2026-07", tz)).toHaveLength(2); // July keeps its readings
    expect(chemLogsInMonth(logs, "2026-08", tz)).toHaveLength(0); // August is a clean sheet
  });

  it("does not lose prior months (they remain viewable)", () => {
    const logs = [log("2026-06-10T15:00:00Z"), log("2026-07-10T15:00:00Z"), log("2026-08-10T15:00:00Z")];
    expect(chemMonthsForLogs(logs, tz, "2026-08")).toEqual(["2026-08", "2026-07", "2026-06"]);
  });
});
