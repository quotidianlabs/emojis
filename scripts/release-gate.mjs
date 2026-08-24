#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = join(ROOT, '.release-gate')
const TARBALLS = join(WORK, 'tarballs')
const APP = join(WORK, 'app')

const CORE = '@quotidianlabs/emojis'
const DATA = '@quotidianlabs/emojis-data'
const REACT = '@quotidianlabs/emojis-react'

const DATA_CDN = 'https://cdn.jsdelivr.net/npm/@quotidianlabs/emojis-data@0.1'

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

const PACKAGES = [
  {
    name: DATA,
    dir: 'packages/emojis-data',
    build: null,
    top: ['LICENSE', 'README.md', 'index.d.ts', 'package.json', 'i18n', 'sets'],
    required: ['i18n/en.json', 'sets/15/native.json'],
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
import Picker from '${REACT}'

const supplied = !window.location.search.includes('default-data')

createRoot(document.getElementById('root')).render(
  <Picker {...(supplied ? { data } : {})} onEmojiSelect={() => {}} />,
)
`,
  )

  await writeFile(
    join(APP, 'types.ts'),
    `import {
  Emoji,
  Picker,
  SearchIndex,
  getEmojiDataFromNative,
  init,
} from '${CORE}'
import type { EmojiMartData } from '${DATA}'
import EmojiPicker from '${REACT}'

export type Data = EmojiMartData
export const used = {
  Emoji,
  EmojiPicker,
  Picker,
  SearchIndex,
  getEmojiDataFromNative,
  init,
}
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
          skipLibCheck: true,
          strict: true,
          target: 'es2020',
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
    check('types resolve from all three packages', true)
  } catch {
    check('types resolve from all three packages', false)
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
    if (PUBLISHED) await renderWithDefaultData(browser, origin)
  } finally {
    await browser.close()
    server.close()
  }
}

const tarballs = await pack()
checkCoreBundle(tarballs[CORE])
await writeScratchApp(tarballs)
installScratchApp()
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
