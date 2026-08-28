import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatTableResultCount } from './resultCount.ts'

test('formatTableResultCount uses a simple total outside server page ranges', () => {
  assert.equal(formatTableResultCount({ total: 0 }), '0 Results')
  assert.equal(formatTableResultCount({ total: 1 }), '1 Result')
  assert.equal(formatTableResultCount({ total: 12 }), '12 Results')
})

test('formatTableResultCount renders a page range only for a valid in-bounds page', () => {
  assert.equal(
    formatTableResultCount({
      total: 80,
      resultOffset: 0,
      resultLimit: 50,
      resultsLabel: 'Resultaten',
      ofLabel: 'van',
    }),
    '1–50 van 80 Resultaten',
  )
})

test('formatTableResultCount ignores invalid or past-the-end ranges', () => {
  assert.equal(formatTableResultCount({ total: 20, resultOffset: 40, resultLimit: 10 }), '20 Results')
  assert.equal(formatTableResultCount({ total: 20, resultOffset: 0, resultLimit: 0 }), '20 Results')
  assert.equal(formatTableResultCount({ total: Number.NaN }), '0 Results')
})
