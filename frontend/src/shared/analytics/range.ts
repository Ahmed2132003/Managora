export type RangeOption = "7d" | "30d" | "90d" | "custom";

export type RangeSelection = {
  start?: string;
  end?: string;
  rangeParam?: string;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildRangeSelection(
  range: RangeOption,
  customStart?: string,
  customEnd?: string
): RangeSelection {
  const today = new Date();

  if (range !== "custom") {
    const days = Number(range.replace("d", ""));
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days + 1);
    return {
      start: toIsoDate(startDate),
      end: toIsoDate(today),
      rangeParam: range,
    };
  }

  if (!customStart || !customEnd) {
    return {};
  }

  const startDate = new Date(customStart);
  const endDate = new Date(customEnd);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return {};
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);

  return {
    start: customStart,
    end: customEnd,
    rangeParam: `${diffDays}d`,
  };
}