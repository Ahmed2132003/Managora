import { describe, expect, it } from "vitest";
import { calculateLeaveDays } from "./utils.ts";

describe("calculateLeaveDays", () => {
  it("returns inclusive day counts", () => {
    expect(calculateLeaveDays("2024-01-01", "2024-01-01")).toBe(1);
    expect(calculateLeaveDays("2024-01-01", "2024-01-03")).toBe(3);
  });

  it("returns zero for invalid ranges", () => {
    expect(calculateLeaveDays("2024-01-05", "2024-01-02")).toBe(0);
    expect(calculateLeaveDays("invalid", "2024-01-02")).toBe(0);
  });
});