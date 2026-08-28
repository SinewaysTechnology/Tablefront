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

/** True while a later infinite-scroll page is in flight, not a sort/search replace. */
export const isServerLoadingMore = ({
  isFetching,
  pageIndex,
  loadedCount,
  serverTotal,
}: {
  isFetching: boolean
  pageIndex: number
  loadedCount: number
  serverTotal: number
}): boolean =>
  Boolean(isFetching) &&
  pageIndex > 0 &&
  loadedCount > 0 &&
  (serverTotal === 0 || loadedCount < serverTotal)

/** Include the local request lock so the loading-more row appears immediately. */
export const isServerLoadingMoreVisible = ({
  requestedMore,
  isFetching,
  pageIndex,
  loadedCount,
  serverTotal,
}: {
  requestedMore: boolean
  isFetching: boolean
  pageIndex: number
  loadedCount: number
  serverTotal: number
}): boolean =>
  (Boolean(requestedMore) && pageIndex > 0) ||
  isServerLoadingMore({
    isFetching,
    pageIndex,
    loadedCount,
    serverTotal,
  })
