import { jest } from '@jest/globals'

function dataFixture() {
  return {
    categories: [{ id: 'smileys', emojis: ['heart', 'wave'] }],
    aliases: { heartpulse: 'heart' },
    emojis: {
      heart: {
        id: 'heart',
        name: 'Red Heart',
        keywords: ['crimson'],
        version: 1,
        skins: [{ unified: '2764-fe0f', native: '❤️' }],
      },
      wave: {
        id: 'wave',
        name: 'Waving Hand',
        keywords: ['hello'],
        version: 1,
        skins: [
          { unified: '1f44b', native: '👋' },
          { unified: '1f44b-1f3fb', native: '👋🏻' },
        ],
      },
    },
  }
}

describe('getEmojiDataFromNative', () => {
  let getEmojiDataFromNative

  beforeEach(async () => {
    jest.resetModules()
    window.localStorage.clear()

    getEmojiDataFromNative = require('../utils').getEmojiDataFromNative
    await require('../config').init({ data: dataFixture() })
  })

  test('resolves a native string to the data for that emoji', async () => {
    expect(await getEmojiDataFromNative('❤️')).toEqual({
      id: 'heart',
      name: 'Red Heart',
      native: '❤️',
      unified: '2764-fe0f',
      keywords: ['crimson'],
      shortcodes: ':heart:',
      aliases: ['heartpulse'],
    })
  })

  test('selects the skin matching the native string it was passed', async () => {
    expect(await getEmojiDataFromNative('👋🏻')).toEqual({
      id: 'wave',
      name: 'Waving Hand',
      native: '👋🏻',
      unified: '1f44b-1f3fb',
      keywords: ['hello'],
      shortcodes: ':wave::skin-tone-2:',
      skin: 2,
    })
  })

  test('selects the base skin for the base native string', async () => {
    expect(await getEmojiDataFromNative('👋')).toEqual({
      id: 'wave',
      name: 'Waving Hand',
      native: '👋',
      unified: '1f44b',
      keywords: ['hello'],
      shortcodes: ':wave:',
      skin: 1,
    })
  })

  test('yields null for a string that matches no emoji', async () => {
    expect(await getEmojiDataFromNative('🦄')).toBeNull()
  })
})
