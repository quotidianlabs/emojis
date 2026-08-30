#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const requireFromRoot = createRequire(import.meta.url)

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = join(ROOT, '.release-gate')
const TARBALLS = join(WORK, 'tarballs')
const APP = join(WORK, 'app')

const CORE = '@quotidianlabs/emojis'
const DATA = '@quotidianlabs/emojis-data'
const REACT = '@quotidianlabs/emojis-react'

const DATA_CDN = 'https://cdn.jsdelivr.net/npm/@quotidianlabs/emojis-data@0.2'

// Named, not matched: a pattern would pass on a tarball missing the newest Set.
const EMOJI_VERSION = '16'

const DATA_DIR = join(ROOT, 'packages/emojis-data')
const REBUILT = join(WORK, 'data')

// Only meaningful once Data is on the registry: jsDelivr cannot serve it before.
const PUBLISHED = process.argv.includes('--published')

const SCRATCH_VERSIONS = {
  '@types/react': '19.2.18',
  esbuild: '0.28.2',
  playwright: '1.62.1',
  react: '19.2.8',
  'react-dom': '19.2.8',
  typescript: '5.9.3',
}

const CORE_COMMONJS_EXPORTS = [
  'Data',
  'Emoji',
  'FrequentlyUsed',
  'I18n',
  'Picker',
  'SafeFlags',
  'SearchIndex',
  'Store',
  'getEmojiDataFromNative',
  'init',
]

// The oldest release of each engine, not the resolved list: floors hold still
// across caniuse-lite updates. Mirrors the core package's query. See ADR-0007.
const SUPPORT_MATRIX = {
  chrome: '87',
  edge: '88',
  firefox: '78',
  ios_saf: '14',
  safari: '14',
}

const PACKAGES = [
  {
    name: DATA,
    dir: 'packages/emojis-data',
    build: null,
    top: ['LICENSE', 'README.md', 'index.d.ts', 'package.json', 'i18n', 'sets'],
    required: ['i18n/en.json', `sets/${EMOJI_VERSION}/native.json`],
  },
  {
    name: CORE,
    dir: 'packages/emojis',
    build: 'build',
    top: ['LICENSE', 'README.md', 'dist', 'package.json'],
    required: [
      'dist/browser.js',
      'dist/index.d.ts',
      'dist/main.js',
      'dist/module.js',
    ],
  },
  {
    name: REACT,
    dir: 'packages/emojis-react',
    build: 'build:react',
    top: ['LICENSE', 'README.md', 'dist', 'package.json'],
    required: ['dist/index.d.ts', 'dist/main.js', 'dist/module.js'],
  },
]

const failures = []

function step(message) {
  console.log(`\n→ ${message}`)
}

function check(description, condition) {
  if (condition) {
    console.log(`  ok   ${description}`)
  } else {
    console.log(`  FAIL ${description}`)
    failures.push(description)
  }
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    stdio: 'inherit',
    encoding: 'utf8',
    ...options,
  })
}

function capture(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...options,
  })
}

function tarEntries(tarball) {
  return capture('tar', ['-tzf', tarball])
    .split('\n')
    .filter(Boolean)
    .map((entry) => entry.replace(/^package\//, ''))
}

function comparableVersion(version) {
  const value = Number.parseFloat(version)
  return Number.isNaN(value) ? -Infinity : value
}

function oldestPerBrowser(resolved) {
  const oldest = {}

  for (const entry of resolved) {
    const [browser, version] = entry.split(' ')
    const held = oldest[browser]
    if (
      held === undefined ||
      comparableVersion(version) < comparableVersion(held)
    ) {
      oldest[browser] = version
    }
  }

  return oldest
}

async function checkSupportMatrix() {
  step('resolve the Support Matrix the core package compiles to')

  let browserslist
  try {
    browserslist = requireFromRoot('browserslist')
  } catch {
    check('browserslist resolves from the workspace', false)
    return
  }

  const manifest = JSON.parse(
    await readFile(join(ROOT, 'packages/emojis/package.json'), 'utf8'),
  )
  check(
    'the core package declares a browserslist query',
    !!manifest.browserslist,
  )
  if (!manifest.browserslist) return

  const resolved = oldestPerBrowser(browserslist(manifest.browserslist))
  const expected = Object.keys(SUPPORT_MATRIX).sort()
  const actual = Object.keys(resolved).sort()

  check(
    `the matrix covers exactly ${expected.join(', ')} (resolved ${actual.join(
      ', ',
    )})`,
    actual.join(',') === expected.join(','),
  )

  for (const browser of [...new Set([...expected, ...actual])].sort()) {
    const floor = SUPPORT_MATRIX[browser]
    const found = resolved[browser]
    check(
      `${browser} floor is ${floor ?? 'outside the matrix'} (resolved ${found ?? 'nothing'})`,
      floor !== undefined &&
        found !== undefined &&
        comparableVersion(found) === comparableVersion(floor),
    )
  }
}

async function pack() {
  await rm(WORK, { recursive: true, force: true })
  await mkdir(TARBALLS, { recursive: true })

  for (const build of PACKAGES.map((pkg) => pkg.build).filter(Boolean)) {
    step(`yarn ${build}`)
    run('yarn', [build], { cwd: ROOT })
  }

  const tarballs = {}
  for (const pkg of PACKAGES) {
    step(`npm pack ${pkg.name}`)
    const output = capture(
      'npm',
      ['pack', '--pack-destination', TARBALLS, '--json'],
      { cwd: join(ROOT, pkg.dir) },
    )
    const [{ filename }] = JSON.parse(output)
    tarballs[pkg.name] = join(TARBALLS, filename)

    const entries = tarEntries(tarballs[pkg.name])
    const top = [...new Set(entries.map((entry) => entry.split('/')[0]))].sort()
    check(
      `${pkg.name} tarball contains exactly ${pkg.top.join(', ')}`,
      top.join(',') === [...pkg.top].sort().join(','),
    )
    for (const required of pkg.required) {
      check(
        `${pkg.name} tarball contains ${required}`,
        entries.includes(required),
      )
    }
  }

  return tarballs
}

function checkCoreBundle(tarball) {
  step('inspect the packed core bundle')
  const bundle = capture('tar', ['-xzOf', tarball, 'package/dist/browser.js'])

  check(
    'core fetches data from this fork',
    bundle.includes(`${DATA_CDN}/sets/`),
  )
  check(
    'core fetches i18n from this fork',
    bundle.includes(`${DATA_CDN}/i18n/`),
  )
  check(
    'core no longer fetches from upstream',
    !bundle.includes('cdn.jsdelivr.net/npm/@emoji-mart'),
  )
  check(
    'core still registers em-emoji-picker',
    bundle.includes('define("em-emoji-picker"'),
  )
  check('core still registers em-emoji', bundle.includes('define("em-emoji"'))
  check(
    'core still writes emoji-mart. storage keys',
    bundle.includes('emoji-mart.'),
  )
  check(
    'core still emits the emoji-mart-emoji class',
    bundle.includes('emoji-mart-emoji'),
  )
  check('core still exposes the EmojiMart global', bundle.includes('EmojiMart'))
}

async function datasourceVersion() {
  const manifest = JSON.parse(
    await readFile(join(DATA_DIR, 'package.json'), 'utf8'),
  )
  return manifest.devDependencies['emoji-datasource']
}

// Two manifests that no build step relates. See ADR-0008.
async function checkDatasourcePin() {
  step('check core and Data agree on an emoji-datasource version')

  const version = await datasourceVersion()
  const source = await readFile(
    join(ROOT, 'packages/emojis/src/components/Emoji/Emoji.tsx'),
    'utf8',
  )
  const pinned = source.match(/DATASOURCE_VERSION = '([^']+)'/)?.[1]

  check(
    `core pins emoji-datasource ${pinned} and Data builds against ${version}`,
    !!version && pinned === version,
  )
}

async function fileContents(directory) {
  const contents = {}

  for (const entry of await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) continue
    const path = join(entry.parentPath, entry.name)
    contents[path.slice(directory.length + 1)] = await readFile(path, 'utf8')
  }

  return contents
}

// The Set files are committed, so nothing else forces them to match the build.
async function checkDataReproducible() {
  step('regenerate the Set files and compare them to the committed ones')

  await mkdir(REBUILT, { recursive: true })

  // Run by path, not copied: require then resolves as it does for the real build.
  try {
    run('node', [join(DATA_DIR, 'build.js')], { cwd: REBUILT })
  } catch {
    check('the Data build runs', false)
    return
  }

  const committed = await fileContents(join(DATA_DIR, 'sets'))
  const rebuilt = await fileContents(join(REBUILT, 'sets'))

  const missing = Object.keys(rebuilt).filter((file) => !(file in committed))
  const extra = Object.keys(committed).filter((file) => !(file in rebuilt))
  const differing = Object.keys(rebuilt).filter(
    (file) => file in committed && committed[file] !== rebuilt[file],
  )

  check(
    `the build produces the committed Set files (${Object.keys(rebuilt).length})`,
    !missing.length && !extra.length && !differing.length,
  )
  for (const file of [...missing, ...extra, ...differing].slice(0, 10)) {
    console.log(`       ${file}`)
  }
}

async function writeScratchApp(tarballs) {
  step('write a scratch React app against the tarballs')
  await mkdir(APP, { recursive: true })

  await writeFile(
    join(APP, 'package.json'),
    JSON.stringify(
      {
        name: 'emojis-release-gate-app',
        version: '0.0.0',
        private: true,
        dependencies: {
          [CORE]: `file:${tarballs[CORE]}`,
          [DATA]: `file:${tarballs[DATA]}`,
          [REACT]: `file:${tarballs[REACT]}`,
          react: SCRATCH_VERSIONS.react,
          'react-dom': SCRATCH_VERSIONS['react-dom'],
        },
        devDependencies: {
          '@types/react': SCRATCH_VERSIONS['@types/react'],
          esbuild: SCRATCH_VERSIONS.esbuild,
          playwright: SCRATCH_VERSIONS.playwright,
          typescript: SCRATCH_VERSIONS.typescript,
        },
      },
      null,
      2,
    ),
  )

  await writeFile(
    join(APP, 'app.jsx'),
    `import React from 'react'
import { createRoot } from 'react-dom/client'
import data from '${DATA}'
import spritesheetData from '${DATA}/sets/${EMOJI_VERSION}/twitter.json'
import Picker from '${REACT}'

const search = window.location.search
const supplied = !search.includes('default-data')
const spritesheet = search.includes('spritesheet')

createRoot(document.getElementById('root')).render(
  spritesheet ? (
    <Picker data={spritesheetData} set="twitter" onEmojiSelect={() => {}} />
  ) : (
    <Picker {...(supplied ? { data } : {})} onEmojiSelect={() => {}} />
  ),
)
`,
  )

  await writeFile(
    join(APP, 'types.ts'),
    `import { createElement } from 'react'
import {
  Emoji,
  Picker,
  SearchIndex,
  getEmojiDataFromNative,
  init,
} from '${CORE}'
import bundledData from '${DATA}'
import type { EmojiMartData } from '${DATA}'
import EmojiPicker, {
  EmojiPickerProps,
  PickerData,
  SelectedEmoji,
} from '${REACT}'

export type Data = EmojiMartData

// The import every README shows. It only type-checks if the packed Data
// declares a default export, which it did not until emojis-data 0.1.1.
export const bundled: PickerData = bundledData

export const used = {
  Emoji,
  EmojiPicker,
  Picker,
  SearchIndex,
  getEmojiDataFromNative,
  init,
}

export const pickerProps: EmojiPickerProps = {
  data: bundledData,
  previewPosition: 'none',
  searchPosition: 'static',
  set: 'twitter',
  theme: 'dark',
  onEmojiSelect: (emoji: SelectedEmoji) => emoji.native,
}

export const rendered = createElement(EmojiPicker, pickerProps)
`,
  )

  await writeFile(
    join(APP, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          esModuleInterop: true,
          jsx: 'react-jsx',
          module: 'commonjs',
          moduleResolution: 'node',
          noEmit: true,
          // Deliberately off: the declarations are the artifact under test.
          skipLibCheck: false,
          strict: true,
          target: 'es2020',
          // Nested in the repo: without this, tsc checks the workspace @types.
          types: [],
        },
        files: ['types.ts'],
      },
      null,
      2,
    ),
  )

  await writeFile(
    join(APP, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Release gate</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="./bundle.js"></script>
  </body>
</html>
`,
  )
}

function installScratchApp() {
  step('install the tarballs')
  run('npm', ['install', '--no-audit', '--no-fund'], { cwd: APP })
}

// Nothing else in this gate loads dist/main.js; every other check reads the ESM entry.
function checkCommonJsEntry() {
  step('require the core package the way a CommonJS consumer would')

  const read = `console.log(Object.keys(require(${JSON.stringify(CORE)})).sort().join(' '))`
  const expected = [...CORE_COMMONJS_EXPORTS].sort().join(' ')

  try {
    const exported = capture('node', ['-e', read], { cwd: APP }).trim()
    check(
      `the CommonJS entry loads and exports ${expected} (${exported})`,
      exported === expected,
    )
  } catch {
    check(`the CommonJS entry loads and exports ${expected}`, false)
  }
}

function checkPeerDependencies() {
  step('resolve the peer dependencies of the React wrapper')
  try {
    capture('npm', ['ls', REACT, CORE, 'react'], { cwd: APP })
    check('npm ls reports no unmet peer dependencies', true)
  } catch (error) {
    console.log(error.stdout || '')
    check('npm ls reports no unmet peer dependencies', false)
  }
}

function checkTypes() {
  step('type check a consumer that imports all three packages')
  try {
    run('npx', ['tsc', '--project', 'tsconfig.json'], { cwd: APP })
    check('the packed declarations resolve and type check', true)
  } catch {
    check('the packed declarations resolve and type check', false)
  }
}

function bundleScratchApp() {
  step('bundle the scratch app')
  run(
    'npx',
    [
      'esbuild',
      'app.jsx',
      '--bundle',
      '--outfile=bundle.js',
      '--define:process.env.NODE_ENV="production"',
    ],
    { cwd: APP },
  )
}

function serve() {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  }

  const server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname
    const file = path === '/' ? '/index.html' : path
    const extension = file.slice(file.lastIndexOf('.'))
    if (!types[extension]) {
      response.writeHead(404).end()
      return
    }

    response.writeHead(200, { 'content-type': types[extension] })
    createReadStream(join(APP, file)).pipe(response)
  })

  return new Promise((ready) => {
    server.listen(0, '127.0.0.1', () => ready(server))
  })
}

function watch(page) {
  const problems = []
  const cdnResponses = []

  page.on('pageerror', (error) => problems.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text())
  })
  page.on('response', (response) => {
    if (response.url().includes('cdn.jsdelivr.net')) {
      cdnResponses.push({ url: response.url(), status: response.status() })
    }
  })

  return { problems, cdnResponses }
}

function mounted(page) {
  return page
    .waitForFunction(
      () => {
        const picker = document.querySelector('em-emoji-picker')
        const emojis = picker?.shadowRoot?.querySelectorAll('.emoji-mart-emoji')
        return !!emojis && emojis.length > 0
      },
      { timeout: 30000 },
    )
    .then(
      () => true,
      () => false,
    )
}

function readEmoji(page) {
  return page.evaluate(() => {
    const picker = document.querySelector('em-emoji-picker')
    const emojis = [...picker.shadowRoot.querySelectorAll('.emoji-mart-emoji')]
    return {
      defined: !!customElements.get('em-emoji-picker'),
      count: emojis.length,
      natives: emojis.slice(0, 5).map((emoji) => emoji.textContent),
    }
  })
}

// Properties nothing inline sets, so the stylesheet is the only thing that can.
const STYLED_BY_THE_STYLESHEET = [
  ['emoji', 'fontFamily'],
  ['button', 'position'],
  ['button', 'borderTopWidth'],
  ['button', 'backgroundColor'],
]

// The stylesheet reaches the shadow root as the text of a <style> node, so a
// non-string value leaves the picker on user-agent defaults rather than throwing.
function readEmojiStyle(page) {
  return page.evaluate(() => {
    const picker = document.querySelector('em-emoji-picker')
    const emoji = picker.shadowRoot.querySelector('.emoji-mart-emoji')

    const bare = document.createElement('div')
    bare.attachShadow({ mode: 'open' })
    document.body.appendChild(bare)
    const bareButton = document.createElement('button')
    const bareEmoji = document.createElement('span')
    bareEmoji.className = 'emoji-mart-emoji'
    bareButton.appendChild(bareEmoji)
    bare.shadowRoot.appendChild(bareButton)

    const read = (element) => {
      const style = getComputedStyle(element)
      return {
        backgroundColor: style.backgroundColor,
        borderTopWidth: style.borderTopWidth,
        fontFamily: style.fontFamily,
        position: style.position,
      }
    }

    const measured = {
      host: getComputedStyle(picker).display,
      emoji: { styled: read(emoji), bare: read(bareEmoji) },
      button: { styled: read(emoji.closest('button')), bare: read(bareButton) },
    }
    bare.remove()

    return measured
  })
}

async function renderWithSuppliedData(browser, origin) {
  step('render the picker from the installed Data')
  const page = await browser.newPage()
  const { problems, cdnResponses } = watch(page)

  await page.goto(origin)
  if (!(await mounted(page))) {
    check(`the picker mounted (${problems.join(' | ')})`, false)
    await page.close()
    return
  }

  const rendered = await readEmoji(page)
  check('em-emoji-picker is registered', rendered.defined)
  check(`picker rendered emoji (${rendered.count})`, rendered.count > 0)
  check(
    `emoji have native characters (${rendered.natives.join(' ')})`,
    rendered.natives.every((native) => native.length > 0),
  )

  const style = await readEmojiStyle(page)
  check(
    `the picker host is laid out by the injected stylesheet (${style.host})`,
    style.host === 'flex',
  )
  for (const [element, property] of STYLED_BY_THE_STYLESHEET) {
    const styled = style[element].styled[property]
    const bare = style[element].bare[property]
    check(
      `the rendered ${element}'s ${property} is ${styled}, not the user agent's ${bare}`,
      styled !== bare,
    )
  }

  const readStore = () =>
    page.evaluate(() => ({
      frequently: JSON.parse(
        window.localStorage['emoji-mart.frequently'] || '{}',
      ),
      last: JSON.parse(window.localStorage['emoji-mart.last'] || 'null'),
    }))

  const before = await readStore()
  await page
    .locator('em-emoji-picker button:has(.emoji-mart-emoji)')
    .first()
    .click()
  const after = await readStore()

  check(
    `selecting an emoji increments its emoji-mart. storage keys (${after.last})`,
    !!after.last &&
      after.frequently[after.last] > (before.frequently[after.last] || 0),
  )

  check('the picker fetched nothing from jsDelivr', cdnResponses.length === 0)
  check(`the page logged no errors (${problems.join(' | ')})`, !problems.length)

  await page.close()
}

// Read from the datasource, not from Data: Data's geometry is what is under test.
function datasourceSheet() {
  const data = requireFromRoot('emoji-datasource')
  const coordinates = {}
  let max = 0

  const native = (unified) =>
    String.fromCodePoint(...unified.split('-').map((u) => Number(`0x${u}`)))

  for (const datum of data) {
    max = Math.max(max, datum.sheet_x, datum.sheet_y)
    coordinates[native(datum.unified)] = { x: datum.sheet_x, y: datum.sheet_y }

    for (const skin in datum.skin_variations || {}) {
      const variation = datum.skin_variations[skin]
      max = Math.max(max, variation.sheet_x, variation.sheet_y)
    }
  }

  return { size: max + 1, coordinates }
}

function percentages(value) {
  const parts = String(value).trim().split(/\s+/)
  if (parts.length !== 2 || !parts.every((part) => part.endsWith('%'))) {
    return null
  }

  return parts.map(Number.parseFloat)
}

function readSprites(page) {
  return page.evaluate(() => {
    const picker = document.querySelector('em-emoji-picker')
    const buttons = [
      ...picker.shadowRoot.querySelectorAll('button[aria-label]'),
    ]

    return buttons
      .map((button) => {
        const sprite = button.querySelector('.emoji-mart-emoji span')
        if (!sprite) return null

        const style = getComputedStyle(sprite)
        if (!style.backgroundImage || style.backgroundImage === 'none') {
          return null
        }

        return {
          native: button.getAttribute('aria-label'),
          position: style.backgroundPosition,
          size: style.backgroundSize,
          image: style.backgroundImage,
        }
      })
      .filter(Boolean)
      .slice(0, 8)
  })
}

async function renderSpritesheet(browser, origin) {
  step('render a non-native Set and check where it lands on the sheet')

  const page = await browser.newPage()
  const { problems } = watch(page)

  await page.goto(`${origin}?spritesheet`)
  if (!(await mounted(page))) {
    check(`the twitter picker mounted (${problems.join(' | ')})`, false)
    await page.close()
    return
  }

  const { size, coordinates } = datasourceSheet()
  const sprites = await readSprites(page)
  check(
    `the twitter picker rendered sprites (${sprites.length})`,
    !!sprites.length,
  )

  const unit = 100 / (size - 1)
  const wrong = []

  for (const sprite of sprites) {
    const expected = coordinates[sprite.native]
    const position = percentages(sprite.position)
    const background = percentages(sprite.size)

    if (
      !expected ||
      !position ||
      !background ||
      Math.abs(position[0] - unit * expected.x) > 0.001 ||
      Math.abs(position[1] - unit * expected.y) > 0.001 ||
      Math.abs(background[0] - 100 * size) > 0.001 ||
      Math.abs(background[1] - 100 * size) > 0.001
    ) {
      wrong.push(`${sprite.native} at ${sprite.position} of ${sprite.size}`)
    }
  }

  check(
    `every sprite sits on the ${size}x${size} grid emoji-datasource describes${
      wrong.length ? ` (${wrong.join(' | ')})` : ''
    }`,
    !wrong.length,
  )

  const version = await datasourceVersion()
  const sheet = sprites[0]?.image.match(
    /emoji-datasource-twitter@([^/]+)\/img\//,
  )?.[1]
  check(
    `the rendered sheet is emoji-datasource-twitter@${version} (${sheet})`,
    sheet === version,
  )

  check(`the page logged no errors (${problems.join(' | ')})`, !problems.length)

  await page.close()
}

async function renderWithDefaultData(browser, origin) {
  step('render the picker from the published Data URL')
  const page = await browser.newPage()
  const { problems, cdnResponses } = watch(page)

  await page.goto(`${origin}?default-data`)
  if (!(await mounted(page))) {
    const attempted = cdnResponses.map((r) => `${r.status} ${r.url}`)
    check(
      `the picker mounted from ${DATA_CDN} (${attempted.join(' | ')})`,
      false,
    )
    await page.close()
    return
  }

  const rendered = await readEmoji(page)
  check(`picker rendered emoji (${rendered.count})`, rendered.count > 0)

  const data = cdnResponses.find((response) =>
    response.url.startsWith(`${DATA_CDN}/sets/`),
  )
  check(
    `the picker fetched Data from ${DATA_CDN} (${data?.status})`,
    data?.status === 200,
  )
  check(`the page logged no errors (${problems.join(' | ')})`, !problems.length)

  await page.close()
}

async function render() {
  step('install a browser')
  run('npx', ['playwright', 'install', 'chromium'], { cwd: APP })

  const require = createRequire(join(APP, 'package.json'))
  const { chromium } = require('playwright')

  const server = await serve()
  const origin = `http://127.0.0.1:${server.address().port}/`
  const browser = await chromium.launch()

  try {
    await renderWithSuppliedData(browser, origin)
    await renderSpritesheet(browser, origin)
    if (PUBLISHED) await renderWithDefaultData(browser, origin)
  } finally {
    await browser.close()
    server.close()
  }
}

await checkSupportMatrix()
const tarballs = await pack()
checkCoreBundle(tarballs[CORE])
await checkDatasourcePin()
await checkDataReproducible()
await writeScratchApp(tarballs)
installScratchApp()
checkCommonJsEntry()
checkPeerDependencies()
checkTypes()
bundleScratchApp()
await render()

console.log('')
if (!PUBLISHED) {
  console.log(
    `Not checked: the default Data URL. jsDelivr cannot serve ${DATA_CDN} until\nData is on the registry. Re-run with --published once it is.`,
  )
}
if (failures.length) {
  console.log(`\nRelease gate FAILED: ${failures.length} check(s)`)
  for (const failure of failures) console.log(`  - ${failure}`)
  process.exit(1)
}
console.log('\nRelease gate passed.')
