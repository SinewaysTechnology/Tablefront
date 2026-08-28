export const CLIENT_SEARCH_DEBOUNCE_MS = 250
export const SERVER_SEARCH_DEBOUNCE_MS = 400

export const resolveSearchDebounceMs = ({
  isServerMode,
  searchDebounceMs,
}: {
  isServerMode: boolean
  searchDebounceMs?: number
}): number => {
  if (typeof searchDebounceMs === 'number' && Number.isFinite(searchDebounceMs) && searchDebounceMs >= 0) {
    return searchDebounceMs
  }

  return isServerMode ? SERVER_SEARCH_DEBOUNCE_MS : CLIENT_SEARCH_DEBOUNCE_MS
}
