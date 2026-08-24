import { execFileSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { join } from 'node:path'

export const CORE = '@quotidianlabs/emojis'
export const DATA = '@quotidianlabs/emojis-data'
export const REACT = '@quotidianlabs/emojis-react'

export const DATA_CDN =
  'https://cdn.jsdelivr.net/npm/@quotidianlabs/emojis-data@0.1'

const SCRATCH_VERSIONS = {
  '@types/react': '18.3.31',
  esbuild: '0.28.2',
  playwright: '1.62.1',
  react: '18.3.1',
  'react-dom': '18.3.1',
  typescript: '5.9.3',
}

export const failures = []

export function step(message) {
  console.log(`\n\u2192 ${message}`)
}

export function check(description, condition) {
  if (condition) {
    console.log(`  ok   ${description}`)
  } else {
    console.log(`  FAIL ${description}`)
    failures.push(description)
  }
}

export function run(command, args, options = {}) {
  return execFileSync(command, args, {
    stdio: 'inherit',
    encoding: 'utf8',
    ...options,
  })
}

export function capture(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...options,
  })
}

export function report(unchecked) {
  console.log('')
  if (unchecked) console.log(unchecked)
  if (failures.length) {
    console.log(`\nFAILED: ${failures.length} check(s)`)
    for (const failure of failures) console.log(`  - ${failure}`)
    process.exit(1)
  }
  console.log('\nPassed.')
}

async function writeScratchApp(app, deps) {
  step('write a consumer app')
  await mkdir(app, { recursive: true })

  await writeFile(
    join(app, 'package.json'),
    JSON.stringify(
      {
        name: 'emojis-consumer-app',
        version: '0.0.0',
        private: true,
        dependencies: {
          [CORE]: deps[CORE],
          [DATA]: deps[DATA],
          [REACT]: deps[REACT],
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
    join(app, 'app.jsx'),
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
    join(app, 'types.ts'),
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
    join(app, 'tsconfig.json'),
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
    join(app, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Consumer app</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="./bundle.js"></script>
  </body>
</html>
`,
  )
}

function installScratchApp(app) {
  step('install the dependencies')
  run('npm', ['install', '--no-audit', '--no-fund'], { cwd: app })
}

function checkPeerDependencies(app) {
  step('resolve the peer dependencies of the React wrapper')
  try {
    capture('npm', ['ls', REACT, CORE, 'react'], { cwd: app })
    check('npm ls reports no unmet peer dependencies', true)
  } catch (error) {
    console.log(error.stdout || '')
    check('npm ls reports no unmet peer dependencies', false)
  }
}

function checkTypes(app) {
  step('type check a consumer that imports all three packages')
  try {
    run('npx', ['tsc', '--project', 'tsconfig.json'], { cwd: app })
    check('types resolve from all three packages', true)
  } catch {
    check('types resolve from all three packages', false)
  }
}

function bundleScratchApp(app) {
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
    { cwd: app },
  )
}

function serve(app) {
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
    createReadStream(join(app, file)).pipe(response)
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

async function render(app, checkDefaultData) {
  step('install a browser')
  run('npx', ['playwright', 'install', 'chromium'], { cwd: app })

  const require = createRequire(join(app, 'package.json'))
  const { chromium } = require('playwright')

  const server = await serve(app)
  const origin = `http://127.0.0.1:${server.address().port}/`
  const browser = await chromium.launch()

  try {
    await renderWithSuppliedData(browser, origin)
    if (checkDefaultData) await renderWithDefaultData(browser, origin)
  } finally {
    await browser.close()
    server.close()
  }
}

// Builds a consumer app whose three dependencies are whatever `deps` says, then
// asserts it behaves: types resolve, peers resolve, the picker renders emoji and
// a selection reaches the storage keys inherited from Upstream.
export async function verifyConsumerApp({ app, deps, checkDefaultData }) {
  await writeScratchApp(app, deps)
  installScratchApp(app)
  checkPeerDependencies(app)
  checkTypes(app)
  bundleScratchApp(app)
  await render(app, checkDefaultData)
}
