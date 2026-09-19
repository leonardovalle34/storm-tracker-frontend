/** Stronger vertical rule marking the first hour column of each day. */
export const DAY_START = 'border-l-2 border-l-line-strong'
/** Compact colored "little square" cell shared by the wind and ocean tables. */
export const CELL = 'h-7 border border-surface px-0 text-center text-xs'
/** Width of the sticky label column and of one hour column (matches the <col> widths). */
export const LABEL_COL_REM = 7
export const HOUR_COL_REM = 2.5
export const HOURS_PER_DAY = 7
export const tableWidth = (days: number): string =>
  `${LABEL_COL_REM + days * HOURS_PER_DAY * HOUR_COL_REM}rem`
