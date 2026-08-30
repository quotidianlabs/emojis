import { jest } from '@jest/globals'

function dataFixture() {
  return {
    categories: [
      {
        id: 'smileys',
        emojis: ['heart', 'blue_heart', 'sparkle', 'cat', 'zap'],
      },
    ],
    aliases: { heartpulse: 'heart' },
    emojis: {
      heart: {
        id: 'heart',
        name: 'Red Heart',
        keywords: ['crimson'],
        version: 1,
        skins: [{ unified: '2764-fe0f', native: '❤️' }],
      },
      blue_heart: {
        id: 'blue_heart',
        name: 'Blue Heart',
        keywords: ['azure'],
        version: 1,
        skins: [{ unified: '1f499', native: '💙' }],
      },
      sparkle: {
        id: 'sparkle',
        name: 'Sparkle',
        keywords: ['glitter'],
        version: 1,
        skins: [{ unified: '2728', native: '✨' }],
      },
      cat: {
        id: 'cat',
        name: 'Cat',
        keywords: ['sparkle'],
        version: 1,
        skins: [{ unified: '1f431', native: '🐱' }],
      },
      zap: {
        id: 'zap',
        name: 'Zap',
        keywords: ['sparkle'],
        version: 1,
        skins: [{ unified: '26a1', native: '⚡' }],
      },
    },
  }
}

describe('SearchIndex', () => {
  let SearchIndex
  let Data

  beforeEach(async () => {
    jest.resetModules()
    window.localStorage.clear()

    SearchIndex = require('../search-index').default
    const config = require('../../config')
    await config.init({ data: dataFixture() })
    Data = config.Data
  })

  describe('get', () => {
    test('resolves an identifier, an alias and a native string to one record', () => {
      const byId = SearchIndex.get('heart')

      expect(byId).toBe(Data.emojis.heart)
      expect(SearchIndex.get('heartpulse')).toBe(byId)
      expect(SearchIndex.get('❤️')).toBe(byId)
    })

    test('returns a record it is handed back unchanged', () => {
      const emoji = Data.emojis.heart

      expect(SearchIndex.get(emoji)).toBe(emoji)
    })
  })

  describe('search', () => {
    test('returns no results for an empty query', async () => {
      expect(await SearchIndex.search('')).toBeNull()
    })

    test('returns no results for a whitespace-only query', async () => {
      expect(await SearchIndex.search('   ')).toBeNull()
    })

    test('returns only records matching every word of a multi-word query', async () => {
      const results = await SearchIndex.search('heart blue')

      expect(results.map((emoji) => emoji.id)).toEqual(['blue_heart'])
    })

    test('orders by match score, breaking ties by identifier', async () => {
      const results = await SearchIndex.search('sparkle')

      expect(results.map((emoji) => emoji.id)).toEqual([
        'sparkle',
        'cat',
        'zap',
      ])
    })

    test('truncates a result set larger than the requested maximum', async () => {
      expect(
        (await SearchIndex.search('heart')).map((emoji) => emoji.id),
      ).toEqual(['heart', 'blue_heart'])

      const results = await SearchIndex.search('heart', { maxResults: 1 })

      expect(results.map((emoji) => emoji.id)).toEqual(['heart'])
    })
  })
})
