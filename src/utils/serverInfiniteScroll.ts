const DEFAULT_ESTIMATE_SIZE = 40

export const resolveEstimateSize = (estimateSize?: number): number =>
  typeof estimateSize === 'number' && Number.isFinite(estimateSize) && estimateSize > 0
    ? estimateSize
    : DEFAULT_ESTIMATE_SIZE

export const serverInfinitePrefetchDistance = (
  loadThreshold: number,
  clientHeight: number,
): number => Math.max(loadThreshold, clientHeight)

export const shouldPrefetchNextServerPage = ({
  distanceFromBottom,
  clientHeight,
  loadThreshold,
  estimateSize,
  loaded,
  total,
  scrollTop,
}: {
  distanceFromBottom: number
  clientHeight: number
  loadThreshold: number
  estimateSize: number
  loaded: number
  total: number
  scrollTop: number
}): boolean => {
  if (loaded <= 0) return false
  if (total <= 0 || loaded >= total) return false

  const safeEstimateSize = resolveEstimateSize(estimateSize)
  const doesNotFillViewport = loaded * safeEstimateSize <= clientHeight + loadThreshold
  if (doesNotFillViewport) return true
  if (scrollTop <= 0) return false

  return distanceFromBottom < serverInfinitePrefetchDistance(loadThreshold, clientHeight)
}
