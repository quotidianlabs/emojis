const { readdirSync, readFileSync } = require('fs')
const { join } = require('path')

const SETS_DIR = join(__dirname, '..', 'sets')
const RESOLVED = require('emoji-datasource/package.json').version

function setFiles() {
  const files = []

  for (const version of readdirSync(SETS_DIR)) {
    for (const file of readdirSync(join(SETS_DIR, version))) {
      files.push([
        `${version}/${file}`,
        JSON.parse(readFileSync(join(SETS_DIR, version, file), 'utf8')),
      ])
    }
  }

  return files
}

const SET_FILES = setFiles()

describe('datasourceVersion', () => {
  test.each(SET_FILES)(
    'is the resolved emoji-datasource in %s',
    (file, data) => {
      expect(data.datasourceVersion).toBe(RESOLVED)
    },
  )
})
