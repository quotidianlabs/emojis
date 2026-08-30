import { jest } from '@jest/globals'

// ADR-0001: the prefix is a Compatibility Surface commitment, not an implementation detail.
const PREFIX = 'emoji-mart.'

describe('Store', () => {
  let Store

  beforeEach(() => {
    jest.resetModules()
    window.localStorage.clear()
    Store = require('../store').default
  })

  test('writes a value under the committed prefix', () => {
    Store.set('last', 'heart')

    expect(window.localStorage.getItem(`${PREFIX}last`)).toBe(
      JSON.stringify('heart'),
    )
    expect(window.localStorage.getItem('last')).toBeNull()
  })

  test('round-trips a string', () => {
    Store.set('last', 'heart')

    expect(Store.get('last')).toBe('heart')
  })

  test('round-trips an object', () => {
    Store.set('frequently', { heart: 2, zap: 1 })

    expect(Store.get('frequently')).toEqual({ heart: 2, zap: 1 })
  })

  test('reads a value written by a previous session', () => {
    window.localStorage.setItem(
      `${PREFIX}frequently`,
      JSON.stringify({ heart: 3 }),
    )

    expect(Store.get('frequently')).toEqual({ heart: 3 })
  })

  test('yields undefined for an absent key', () => {
    expect(Store.get('frequently')).toBeUndefined()
  })

  test('yields undefined for a corrupt value rather than throwing', () => {
    window.localStorage.setItem(`${PREFIX}frequently`, '{ not json')

    expect(() => Store.get('frequently')).not.toThrow()
    expect(Store.get('frequently')).toBeUndefined()
  })
})
