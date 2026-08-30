#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = join(ROOT, 'packages/emojis-website')
const DIST = join(SITE, 'dist')

const REPO = 'https://github.com/quotidianlabs/emojis'

// Upstream's repository link is not a match: the fork banner has to keep it.
const PREVIOUS_MAINTAINER = [
  /missiveapp\.com/i,
  /by\s+Missive/i,
  /Missive\s+team/i,
  /@missiveapp/i,
  /missive\.[0-9a-f]+\.(png|jpg|svg)/i,
]

const UNRESOLVED_TEMPLATE = [
  /<extends/i,
  /<block\b/i,
  /<\/if>/i,
  /<else>/i,
  /\{\{/,
]

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
}

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

function serve() {
  const server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname
    const file = path === '/' ? '/index.html' : path
    const type = TYPES[extname(file)]
    if (!type) {
      response.writeHead(404).end()
      return
    }

    const stream = createReadStream(join(DIST, file))
    stream.on('error', () => response.writeHead(404).end())
    stream.on('open', () => {
      response.writeHead(200, { 'content-type': type })
      stream.pipe(response)
    })
  })

  return new Promise((ready) => {
    server.listen(0, '127.0.0.1', () => ready(server))
  })
}

function watch(page) {
  const problems = []

  page.on('pageerror', (error) => problems.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text())
  })
  page.on('requestfailed', (request) => {
    problems.push(`request failed: ${request.url()}`)
  })

  return problems
}

async function checkMarkup(pages) {
  step('check the built markup')

  for (const name of pages) {
    const html = await readFile(join(DIST, name), 'utf8')

    const unresolved = UNRESOLVED_TEMPLATE.filter((tag) => tag.test(html))
    check(
      `${name} resolved its templating (${unresolved.join(' ') || 'clean'})`,
      !unresolved.length,
    )

    const traces = PREVIOUS_MAINTAINER.filter((trace) => trace.test(html))
    check(
      `${name} does not present the previous maintainer (${traces.join(' ') || 'clean'})`,
      !traces.length,
    )

    check(
      `${name} keeps Emoji Mart as the product name`,
      /Emoji ?Mart/.test(html),
    )
  }
}

// Reads the rendered DOM: the commit link is filled in at runtime.
async function checkProvenance(page) {
  const footer = await page.evaluate(() => {
    const link = document.querySelector('#build-commit')
    return {
      sha: link?.textContent.trim(),
      href: link?.getAttribute('href'),
      text: document.querySelector('footer').innerText,
    }
  })

  check(
    `the footer names the commit it was built from (${footer.sha})`,
    /^[0-9a-f]{7,40}$/.test(footer.sha ?? ''),
  )
  check(
    `the footer links that commit (${footer.href})`,
    footer.href?.startsWith(`${REPO}/commit/`),
  )

  const version = footer.text.match(/\b\d+\.\d+\.\d+\b/)?.[0]
  check(
    `the footer shows no package version number (${version ?? 'none'})`,
    !version,
  )
}

// Read from source, so a page that fails to mount fails rather than skips.
async function pagesThatMountAPicker(sources) {
  const mounting = []
  for (const name of sources) {
    const source = await readFile(join(SITE, name), 'utf8')
    if (/Picker\(|<em-emoji-picker/.test(source)) mounting.push(name)
  }

  return mounting
}

async function render(browser, origin, name, mustMount) {
  const page = await browser.newPage()
  const problems = watch(page)

  await page.goto(`${origin}${name}`, { waitUntil: 'load' })

  if (mustMount) {
    const mounted = await page
      .waitForFunction(
        () => {
          const picker = document.querySelector('em-emoji-picker')
          const emoji =
            picker?.shadowRoot?.querySelectorAll('.emoji-mart-emoji')
          return !!emoji && emoji.length > 0
        },
        { timeout: 30000 },
      )
      .then(
        () => true,
        () => false,
      )

    if (mounted) {
      const rendered = await page.evaluate(() => ({
        defined: !!customElements.get('em-emoji-picker'),
        count: document
          .querySelector('em-emoji-picker')
          .shadowRoot.querySelectorAll('.emoji-mart-emoji').length,
      }))
      check(`${name} registered em-emoji-picker`, rendered.defined)
      check(`${name} rendered emoji (${rendered.count})`, rendered.count > 0)
    } else {
      check(`${name} mounted its picker`, false)
    }
  }

  if (name === 'index.html') await checkProvenance(page)

  check(`${name} logged no errors (${problems.join(' | ')})`, !problems.length)

  await page.close()
}

const pages = (await readdir(DIST))
  .filter((file) => extname(file) === '.html')
  .sort()

const sources = (await readdir(SITE)).filter(
  (file) => extname(file) === '.html' && file !== 'layout.html',
)
const mounting = await pagesThatMountAPicker(sources)

step('check the build emitted every page')
const examples = (names) => names.filter((name) => name.startsWith('example-'))
check(
  `every example page was built (${examples(pages).length} of ${examples(sources).length})`,
  examples(pages).length === examples(sources).length,
)
const missing = sources.filter((name) => !pages.includes(name))
check(
  `every source page was built (${missing.join(' ') || 'none missing'})`,
  !missing.length,
)

await checkMarkup(pages)

step('install a browser')
execFileSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' })

step(`render every page in a browser (${mounting.length} owe a picker)`)
const server = await serve()
const origin = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch()

try {
  for (const name of pages) {
    await render(browser, origin, name, mounting.includes(name))
  }
} finally {
  await browser.close()
  server.close()
}

console.log('')
if (failures.length) {
  console.log(`Website check FAILED: ${failures.length} check(s)`)
  for (const failure of failures) console.log(`  - ${failure}`)
  process.exit(1)
}
console.log(`Website check passed. ${REPO}`)
