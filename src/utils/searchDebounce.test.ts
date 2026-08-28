import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CLIENT_SEARCH_DEBOUNCE_MS,
  SERVER_SEARCH_DEBOUNCE_MS,
  resolveSearchDebounceMs,
} from './searchDebounce.ts'

test('resolveSearchDebounceMs uses client and server defaults', () => {
  assert.equal(resolveSearchDebounceMs({ isServerMode: false }), CLIENT_SEARCH_DEBOUNCE_MS)
  assert.equal(resolveSearchDebounceMs({ isServerMode: true }), SERVER_SEARCH_DEBOUNCE_MS)
})

test('resolveSearchDebounceMs accepts a finite non-negative override', () => {
  assert.equal(resolveSearchDebounceMs({ isServerMode: true, searchDebounceMs: 0 }), 0)
  assert.equal(resolveSearchDebounceMs({ isServerMode: false, searchDebounceMs: 120 }), 120)
})

test('resolveSearchDebounceMs rejects invalid overrides', () => {
  assert.equal(resolveSearchDebounceMs({ isServerMode: true, searchDebounceMs: -1 }), SERVER_SEARCH_DEBOUNCE_MS)
  assert.equal(resolveSearchDebounceMs({ isServerMode: false, searchDebounceMs: Number.NaN }), CLIENT_SEARCH_DEBOUNCE_MS)
  assert.equal(resolveSearchDebounceMs({ isServerMode: true, searchDebounceMs: Number.POSITIVE_INFINITY }), SERVER_SEARCH_DEBOUNCE_MS)
})
