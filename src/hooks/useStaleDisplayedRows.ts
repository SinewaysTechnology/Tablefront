'use client'

import { useState } from 'react'
import {
  hasStaleDisplayedRows,
  nextStaleRowsTracker,
  type StaleRowsTracker,
} from '../utils/tableContentStatus'

/**
 * True while the visible rows still belong to the previous sort/search/filter.
 * Cache hits that swap rows in the same turn are not stale.
 */
export function useStaleDisplayedRows(queryKey: string, fingerprint: string): boolean {
  const [tracker, setTracker] = useState<StaleRowsTracker>(() => ({
    queryKey,
    fingerprint,
    staleFingerprint: null,
  }))

  let resolved = tracker
  if (queryKey !== tracker.queryKey || fingerprint !== tracker.fingerprint) {
    resolved = nextStaleRowsTracker(tracker, { queryKey, fingerprint })
    setTracker(resolved)
  }

  return hasStaleDisplayedRows(resolved)
}
