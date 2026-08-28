import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  resolveEstimateSize,
  shouldPrefetchNextServerPage,
} from './serverInfiniteScroll.ts'

test('shouldPrefetchNextServerPage waits for rows and a known remaining total', () => {
  assert.equal(shouldPrefetchNextServerPage({
    distanceFromBottom: 0,
    clientHeight: 800,
    loadThreshold: 100,
    estimateSize: 40,
    loaded: 0,
    total: 100,
    scrollTop: 10,
  }), false)
  assert.equal(shouldPrefetchNextServerPage({
    distanceFromBottom: 0,
    clientHeight: 800,
    loadThreshold: 100,
    estimateSize: 40,
    loaded: 50,
    total: 0,
    scrollTop: 10,
  }), false)
  assert.equal(shouldPrefetchNextServerPage({
    distanceFromBottom: 0,
    clientHeight: 800,
    loadThreshold: 100,
    estimateSize: 40,
    loaded: 100,
    total: 100,
    scrollTop: 10,
  }), false)
})

test('shouldPrefetchNextServerPage prefetches when the first page does not fill the viewport', () => {
  assert.equal(shouldPrefetchNextServerPage({
    distanceFromBottom: 0,
    clientHeight: 800,
    loadThreshold: 100,
    estimateSize: 40,
    loaded: 10,
    total: 400,
    scrollTop: 0,
  }), true)
})

test('shouldPrefetchNextServerPage does not prefetch from the top of a filled viewport', () => {
  assert.equal(shouldPrefetchNextServerPage({
    distanceFromBottom: 4000,
    clientHeight: 800,
    loadThreshold: 100,
    estimateSize: 40,
    loaded: 100,
    total: 400,
    scrollTop: 0,
  }), false)
})

test('resolveEstimateSize rejects zero and non-finite values', () => {
  assert.equal(resolveEstimateSize(0), 40)
  assert.equal(resolveEstimateSize(-8), 40)
  assert.equal(resolveEstimateSize(Number.NaN), 40)
  assert.equal(resolveEstimateSize(24), 24)
})
