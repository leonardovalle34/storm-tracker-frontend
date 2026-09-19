export type TempUnit = 'C' | 'F'

export const celsiusToFahrenheit = (c: number) => (c * 9) / 5 + 32

/** The API always sends Celsius; this is the value to show in the chosen unit. */
export const toUnit = (celsius: number, unit: TempUnit) =>
  unit === 'F' ? celsiusToFahrenheit(celsius) : celsius

/** "28°C" / "82°F" (`withUnit` false gives just "28°"). Rounds after converting. */
export function formatTemp(celsius: number, unit: TempUnit, digits = 0, withUnit = true): string {
  const value = toUnit(celsius, unit).toFixed(digits)
  return `${Number(value) === 0 ? value.replace('-', '') : value}°${withUnit ? unit : ''}`
}
