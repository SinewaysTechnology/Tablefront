import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildDisplayedRowsFingerprint,
  hasStaleDisplayedRows,
  isReplacingTableContent,
  isTableBodyRefreshing,
  nextStaleRowsTracker,
  resolveTableContentStatus,
  shouldShowLoadingMoreIndicator,
} from './tableContentStatus.ts'

test('isReplacingTableContent ignores append fetches', () => {
  assert.equal(isReplacingTableContent({ isBusy: true, isAppending: false }), true)
  assert.equal(isReplacingTableContent({ isBusy: true, isAppending: true }), false)
  assert.equal(isReplacingTableContent({ isBusy: false, isAppending: false }), false)
})

test('isTableBodyRefreshing only dims stale rows during a replace fetch', () => {
  assert.equal(isTableBodyRefreshing({
    rowCount: 20,
    isReplacing: true,
    isStale: true,
  }), true)
  assert.equal(isTableBodyRefreshing({
    rowCount: 20,
    isReplacing: true,
    isStale: false,
  }), false)
  assert.equal(isTableBodyRefreshing({
    rowCount: 0,
    isReplacing: true,
    isStale: true,
  }), false)
  assert.equal(isTableBodyRefreshing({
    rowCount: 20,
    isReplacing: false,
    isStale: true,
  }), false)
})

test('resolveTableContentStatus keeps headers empty until the delayed loader', () => {
  assert.equal(resolveTableContentStatus({
    rowCount: 0,
    isReplacing: true,
    showDelayedLoading: false,
  }), 'pending')
  assert.equal(resolveTableContentStatus({
    rowCount: 0,
    isReplacing: true,
    showDelayedLoading: true,
  }), 'loading')
})

test('resolveTableContentStatus shows empty only after loading has finished', () => {
  assert.equal(resolveTableContentStatus({
    rowCount: 0,
    isReplacing: false,
    showDelayedLoading: false,
  }), 'empty')
  assert.equal(resolveTableContentStatus({
    rowCount: 12,
    isReplacing: true,
    showDelayedLoading: true,
  }), 'rows')
})

test('shouldShowLoadingMoreIndicator is instant for append fetches with rows', () => {
  assert.equal(shouldShowLoadingMoreIndicator({
    isLoadingMore: true,
    isRefreshing: false,
    rowCount: 50,
  }), true)
  assert.equal(shouldShowLoadingMoreIndicator({
    isLoadingMore: true,
    isRefreshing: true,
    rowCount: 50,
  }), false)
  assert.equal(shouldShowLoadingMoreIndicator({
    isLoadingMore: true,
    isRefreshing: false,
    rowCount: 0,
  }), false)
})

test('nextStaleRowsTracker treats cache hits as fresh when rows change with the query', () => {
  const previous = {
    queryKey: 'created_at|desc',
    fingerprint: '50|a|m|z',
    staleFingerprint: null,
  }
  const cached = nextStaleRowsTracker(previous, {
    queryKey: 'naam_client|asc',
    fingerprint: '50|b|n|y',
  })
  assert.equal(hasStaleDisplayedRows(cached), false)
})

test('nextStaleRowsTracker keeps rows stale until the displayed set changes', () => {
  const previous = {
    queryKey: 'created_at|desc',
    fingerprint: '50|a|m|z',
    staleFingerprint: null,
  }
  const waiting = nextStaleRowsTracker(previous, {
    queryKey: 'naam_client|asc',
    fingerprint: '50|a|m|z',
  })
  assert.equal(hasStaleDisplayedRows(waiting), true)

  const arrived = nextStaleRowsTracker(waiting, {
    queryKey: 'naam_client|asc',
    fingerprint: '50|b|n|y',
  })
  assert.equal(hasStaleDisplayedRows(arrived), false)
})

test('nextStaleRowsTracker ignores fingerprint changes for the same query', () => {
  const previous = {
    queryKey: 'created_at|desc',
    fingerprint: '50|a|m|z',
    staleFingerprint: null,
  }
  const updated = nextStaleRowsTracker(previous, {
    queryKey: 'created_at|desc',
    fingerprint: '50|b|n|y',
  })
  assert.equal(hasStaleDisplayedRows(updated), false)
})

test('nextStaleRowsTracker is idempotent for the same current snapshot', () => {
  const previous = {
    queryKey: 'created_at|desc',
    fingerprint: '50|a|m|z',
    staleFingerprint: null,
  }
  const current = {
    queryKey: 'naam_client|asc',
    fingerprint: '50|a|m|z',
  }
  const once = nextStaleRowsTracker(previous, current)
  const twice = nextStaleRowsTracker(once, current)
  assert.deepEqual(once, twice)
  assert.equal(hasStaleDisplayedRows(twice), true)
})

test('buildDisplayedRowsFingerprint uses ends and midpoint', () => {
  assert.equal(
    buildDisplayedRowsFingerprint({
      rows: [{ id: 'a' }, { id: 'm' }, { id: 'z' }],
      idField: 'id',
    }),
    '3|a|m|z',
  )
  assert.equal(
    buildDisplayedRowsFingerprint({
      rows: [],
      idField: 'id',
    }),
    '0|||',
  )
})
