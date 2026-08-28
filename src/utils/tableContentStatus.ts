export type TableContentStatus = 'rows' | 'empty' | 'pending' | 'loading'

export type StaleRowsTracker = {
  queryKey: string
  fingerprint: string
  staleFingerprint: string | null
}

export const isReplacingTableContent = ({
  isBusy,
  isAppending,
}: {
  isBusy: boolean
  isAppending: boolean
}): boolean => Boolean(isBusy) && !isAppending

export const isTableBodyRefreshing = ({
  rowCount,
  isReplacing,
  isStale,
}: {
  rowCount: number
  isReplacing: boolean
  isStale: boolean
}): boolean => isReplacing && isStale && rowCount > 0

export const resolveTableContentStatus = ({
  rowCount,
  isReplacing,
  showDelayedLoading,
}: {
  rowCount: number
  isReplacing: boolean
  showDelayedLoading: boolean
}): TableContentStatus => {
  if (rowCount > 0) return 'rows'
  if (!isReplacing) return 'empty'
  if (showDelayedLoading) return 'loading'
  return 'pending'
}

export const shouldShowLoadingMoreIndicator = ({
  isLoadingMore,
  isRefreshing,
  rowCount,
}: {
  isLoadingMore: boolean
  isRefreshing: boolean
  rowCount: number
}): boolean => Boolean(isLoadingMore) && !isRefreshing && rowCount > 0

export const buildDisplayedRowsFingerprint = <T>({
  rows,
  idField,
}: {
  rows: T[]
  idField: keyof T
}): string => {
  const first = rows[0]
  const mid = rows[Math.floor(rows.length / 2)]
  const last = rows[rows.length - 1]
  return [
    rows.length,
    String(first?.[idField] ?? ''),
    String(mid?.[idField] ?? ''),
    String(last?.[idField] ?? ''),
  ].join('|')
}

export const nextStaleRowsTracker = (
  previous: StaleRowsTracker,
  current: { queryKey: string; fingerprint: string },
): StaleRowsTracker => {
  const staleFingerprint =
    current.queryKey === previous.queryKey
      ? previous.staleFingerprint
      : previous.fingerprint

  return {
    queryKey: current.queryKey,
    fingerprint: current.fingerprint,
    staleFingerprint: current.fingerprint === staleFingerprint ? staleFingerprint : null,
  }
}

export const hasStaleDisplayedRows = (tracker: StaleRowsTracker): boolean =>
  tracker.staleFingerprint !== null && tracker.fingerprint === tracker.staleFingerprint
