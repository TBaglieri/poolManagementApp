import { describe, it, expect } from "vitest";
import { toCSV } from "./csv";

describe("toCSV", () => {
  const cols = [
    { key: "name" as const, label: "Name" },
    { key: "hours" as const, label: "Hours" },
  ];

  it("writes a header row and one row per record", () => {
    const csv = toCSV([{ name: "Alex", hours: 8 }, { name: "Sam", hours: 6 }], cols);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Name,Hours");
    expect(lines[1]).toBe("Alex,8");
    expect(lines[2]).toBe("Sam,6");
  });

  it("quotes and escapes cells containing commas, quotes, or newlines", () => {
    const csv = toCSV([{ name: 'Doe, "Jane"', hours: "a\nb" }], cols);
    const row = csv.split("\r\n")[1];
    expect(row).toBe('"Doe, ""Jane""","a\nb"');
  });

  it("renders null/undefined as empty cells", () => {
    const csv = toCSV([{ name: null, hours: undefined }], cols);
    expect(csv.split("\r\n")[1]).toBe(",");
  });
});
