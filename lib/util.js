// Small parsing helpers


export function parseId(s) {
  if (s == null || !/^[+-]?\d+$/.test(String(s).trim())) return null;
  const n = Number(String(s).trim());
  return Number.isSafeInteger(n) ? n : null;
}
