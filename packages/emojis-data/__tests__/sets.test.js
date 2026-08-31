const { readdirSync, readFileSync } = require('fs')
const { join } = require('path')

const SETS_DIR = join(__dirname, '..', 'sets')
const FLAG_TR_EMOJI_VERSION = 2

function setFilesCarryingFlagTr() {
  const files = []

  for (const version of readdirSync(SETS_DIR)) {
    if (parseFloat(version) < FLAG_TR_EMOJI_VERSION) continue

    for (const file of readdirSync(join(SETS_DIR, version))) {
      files.push([
        `${version}/${file}`,
        JSON.parse(readFileSync(join(SETS_DIR, version, file), 'utf8')),
      ])
    }
  }

  return files
}

const SET_FILES = setFilesCarryingFlagTr()

describe('flag-tr', () => {
  test.each(SET_FILES)('is named Türkiye Flag in %s', (file, data) => {
    expect(data.emojis['flag-tr'].name).toBe('Türkiye Flag')
  })

  test.each(SET_FILES)('is searchable by turkey in %s', (file, data) => {
    expect(data.emojis['flag-tr'].keywords).toContain('turkey')
  })
})
