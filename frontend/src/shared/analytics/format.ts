const currencyFormatter = new Intl.NumberFormat("ar", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ar", {
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("ar", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function formatCurrency(value?: string | null) {
  const numeric = Number(value);
  if (!value || Number.isNaN(numeric)) {
    return "-";
  }
  return currencyFormatter.format(numeric);
}

export function formatNumber(value?: string | null) {
  const numeric = Number(value);
  if (!value || Number.isNaN(numeric)) {
    return "-";
  }
  return numberFormatter.format(numeric);
}

export function formatPercent(value?: string | null) {
  const numeric = Number(value);
  if (!value || Number.isNaN(numeric)) {
    return "-";
  }
  return percentFormatter.format(numeric);
}