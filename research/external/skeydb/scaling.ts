export const COMPUTABLE_STATS = new Set(['ATK', 'DEF', 'CON'])

export function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
