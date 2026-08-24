#!/usr/bin/env node
import { mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CORE,
  DATA,
  DATA_CDN,
  REACT,
  capture,
  check,
  report,
  run,
  step,
  verifyConsumerApp,
} from './consumer-app.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = join(ROOT, '.release-gate')
const TARBALLS = join(WORK, 'tarballs')
const APP = join(WORK, 'app')

// Only meaningful once Data is on the registry: jsDelivr cannot serve it before.
const PUBLISHED = process.argv.includes('--published')

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

const tarballs = await pack()
checkCoreBundle(tarballs[CORE])

await verifyConsumerApp({
  app: APP,
  deps: {
    [CORE]: `file:${tarballs[CORE]}`,
    [DATA]: `file:${tarballs[DATA]}`,
    [REACT]: `file:${tarballs[REACT]}`,
  },
  checkDefaultData: PUBLISHED,
})

report(
  PUBLISHED
    ? null
    : `Not checked: the default Data URL. jsDelivr cannot serve ${DATA_CDN} until\nData is on the registry. Re-run with --published once it is.`,
)
