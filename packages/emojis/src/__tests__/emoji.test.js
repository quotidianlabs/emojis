import { jest } from '@jest/globals'

const LITERAL = '16.0.0'

function dataFixture(extra) {
  return {
    categories: [{ id: 'people', emojis: ['+1'] }],
    aliases: {},
    emojis: {
      '+1': {
        id: '+1',
        name: 'Thumbs Up',
        keywords: ['approve'],
        version: 1,
        skins: [{ unified: '1f44d', native: '👍', x: 5, y: 7 }],
      },
    },
    sheet: { cols: 62, rows: 62 },
    ...extra,
  }
}

describe('Emoji image URLs', () => {
  let Emoji, h, render, warn

  async function setup(data) {
    jest.resetModules()
    ;({ h, render } = require('preact'))
    Emoji = require('../components/Emoji').Emoji
    await require('../config').init({ data })
  }

  function renderEmoji(props) {
    const container = document.createElement('div')
    render(h(Emoji, { set: 'twitter', skin: 1, id: '+1', ...props }), container)
    return container
  }

  function imageURL(container) {
    return container.querySelector('img').getAttribute('src')
  }

  function spritesheetURL(container) {
    const style = container.querySelector('span span').style.backgroundImage
    return style.replace(/^url\(["']?/, '').replace(/["']?\)$/, '')
  }

  beforeEach(() => {
    window.localStorage.clear()
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
  })

  test('builds both URLs from the version Data declares', async () => {
    await setup(dataFixture({ datasourceVersion: '15.0.1' }))

    expect(imageURL(renderEmoji())).toBe(
      'https://cdn.jsdelivr.net/npm/emoji-datasource-twitter@15.0.1/img/twitter/64/1f44d.png',
    )
    expect(spritesheetURL(renderEmoji({ spritesheet: true }))).toBe(
      'https://cdn.jsdelivr.net/npm/emoji-datasource-twitter@15.0.1/img/twitter/sheets-256/64.png',
    )
    expect(warn).not.toHaveBeenCalled()
  })

  test('falls back to its own version when Data declares none', async () => {
    await setup(dataFixture())

    expect(imageURL(renderEmoji())).toBe(
      `https://cdn.jsdelivr.net/npm/emoji-datasource-twitter@${LITERAL}/img/twitter/64/1f44d.png`,
    )
    expect(spritesheetURL(renderEmoji({ spritesheet: true }))).toBe(
      `https://cdn.jsdelivr.net/npm/emoji-datasource-twitter@${LITERAL}/img/twitter/sheets-256/64.png`,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[EmojiMart]'))
  })

  test.each([
    ['16.0.0/../../elsewhere', 'a path escaping its segment'],
    ['../../elsewhere', 'a relative path'],
    ['16.0.0/img/twitter', 'extra path segments'],
    ['16', 'an incomplete version'],
    ['', 'an empty string'],
    ['  16.0.0  ', 'surrounding whitespace'],
    [16, 'a number'],
    [{ toString: () => '16.0.0' }, 'an object'],
  ])('rejects %p, %s', async (datasourceVersion) => {
    await setup(dataFixture({ datasourceVersion }))

    const prefix = `https://cdn.jsdelivr.net/npm/emoji-datasource-twitter@${LITERAL}/`
    expect(imageURL(renderEmoji())).toBe(`${prefix}img/twitter/64/1f44d.png`)
    expect(spritesheetURL(renderEmoji({ spritesheet: true }))).toBe(
      `${prefix}img/twitter/sheets-256/64.png`,
    )
    expect(warn).toHaveBeenCalled()
  })

  test('warns once however many Emoji render', async () => {
    await setup(dataFixture())

    for (let i = 0; i < 50; i++) renderEmoji()

    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('leaves consumer-supplied URLs alone and stays quiet', async () => {
    await setup(dataFixture())

    const props = {
      getImageURL: (set, unified) => `./${set}/${unified}.png`,
      getSpritesheetURL: (set) => `./${set}.png`,
    }

    expect(imageURL(renderEmoji(props))).toBe('./twitter/1f44d.png')
    expect(spritesheetURL(renderEmoji({ ...props, spritesheet: true }))).toBe(
      './twitter.png',
    )
    expect(warn).not.toHaveBeenCalled()
  })

  test('stays quiet for the native Set, which builds no image URL', async () => {
    await setup(dataFixture())

    const container = renderEmoji({ set: 'native' })

    expect(container.textContent).toBe('👍')
    expect(warn).not.toHaveBeenCalled()
  })
})
