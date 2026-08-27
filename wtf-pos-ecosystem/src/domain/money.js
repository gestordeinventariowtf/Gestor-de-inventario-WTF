export function toCents(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100);
}

export function fromCents(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}
