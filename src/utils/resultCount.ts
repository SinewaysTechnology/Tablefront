const toSafeCount = (value: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0

export const formatTableResultCount = ({
  total,
  resultOffset,
  resultLimit,
  resultLabel = 'Result',
  resultsLabel = 'Results',
  ofLabel = 'of',
}: {
  total: number
  resultOffset?: number
  resultLimit?: number
  resultLabel?: string
  resultsLabel?: string
  ofLabel?: string
}): string => {
  const safeTotal = toSafeCount(total)
  const noun = safeTotal === 1 ? resultLabel : resultsLabel
  const hasResultRange =
    typeof resultOffset === 'number' &&
    Number.isFinite(resultOffset) &&
    resultOffset >= 0 &&
    typeof resultLimit === 'number' &&
    Number.isFinite(resultLimit) &&
    resultLimit > 0
  if (!hasResultRange || safeTotal === 0 || resultOffset >= safeTotal) {
    return `${safeTotal.toLocaleString()} ${noun}`
  }
  const resultStart = resultOffset + 1
  const resultEnd = Math.min(resultOffset + resultLimit, safeTotal)
  return `${resultStart.toLocaleString()}–${resultEnd.toLocaleString()} ${ofLabel} ${safeTotal.toLocaleString()} ${noun}`
}
