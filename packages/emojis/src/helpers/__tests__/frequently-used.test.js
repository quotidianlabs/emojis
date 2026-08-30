import { jest } from '@jest/globals'

describe('FrequentlyUsed', () => {
  let FrequentlyUsed
  let Store

  beforeEach(() => {
    jest.resetModules()
    window.localStorage.clear()
    FrequentlyUsed = require('../frequently-used').default
    Store = require('../store').default
  })

  describe('add', () => {
    test('increments the count for the recorded emoji', () => {
      FrequentlyUsed.add({ id: 'heart' })
      FrequentlyUsed.add({ id: 'zap' })
      FrequentlyUsed.add({ id: 'heart' })

      expect(Store.get('frequently')).toEqual({ heart: 2, zap: 1 })
    })

    test('records the emoji as the most recently used', () => {
      FrequentlyUsed.add({ id: 'heart' })
      FrequentlyUsed.add({ id: 'zap' })

      expect(Store.get('last')).toBe('zap')
    })

    test('builds on counts stored by a previous session', () => {
      Store.set('frequently', { heart: 4 })

      FrequentlyUsed.add({ id: 'heart' })

      expect(Store.get('frequently')).toEqual({ heart: 5 })
    })
  })

  describe('get', () => {
    test('returns nothing when no rows are requested', () => {
      expect(FrequentlyUsed.get({ maxFrequentRows: 0, perLine: 9 })).toEqual([])
    })

    test('returns nothing when no rows are requested and history exists', () => {
      Store.set('frequently', { heart: 3 })

      expect(FrequentlyUsed.get({ maxFrequentRows: 0, perLine: 9 })).toEqual([])
    })

    test('seeds defaults bounded by the line length when nothing is stored', () => {
      const emojiIds = FrequentlyUsed.get({ maxFrequentRows: 4, perLine: 4 })

      expect(emojiIds).toEqual([
        '+1',
        'grinning',
        'kissing_heart',
        'heart_eyes',
      ])
    })

    test('orders by use count descending, breaking ties by identifier', () => {
      Store.set('frequently', { zap: 1, heart: 3, cat: 1, joy: 2 })

      const emojiIds = FrequentlyUsed.get({ maxFrequentRows: 4, perLine: 9 })

      expect(emojiIds).toEqual(['heart', 'joy', 'cat', 'zap'])
    })

    test('evicts everything beyond the requested capacity', () => {
      Store.set('frequently', { heart: 4, joy: 3, cat: 2, zap: 1 })
      Store.set('last', 'heart')

      const emojiIds = FrequentlyUsed.get({ maxFrequentRows: 1, perLine: 3 })

      expect(emojiIds).toEqual(['heart', 'joy', 'cat'])
      expect(Store.get('frequently')).toEqual({ heart: 4, joy: 3, cat: 2 })
    })

    test('retains the most recently used emoji, displacing the last kept entry', () => {
      Store.set('frequently', { heart: 4, joy: 3, cat: 2, zap: 1 })
      Store.set('last', 'zap')

      const emojiIds = FrequentlyUsed.get({ maxFrequentRows: 1, perLine: 3 })

      expect(emojiIds).toEqual(['heart', 'joy', 'zap'])
      expect(Store.get('frequently')).toEqual({ heart: 4, joy: 3, zap: 1 })
    })
  })
})
