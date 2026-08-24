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
  step,
  verifyConsumerApp,
} from './consumer-app.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const APP = join(ROOT, '.verify-release', 'app')

const DIRECTORIES = {
  'emojis-data': DATA,
  emojis: CORE,
  'emojis-react': REACT,
}

function argument(name) {
  const flag = `--${name}`
  const index = process.argv.indexOf(flag)
  if (index === -1 || !process.argv[index + 1]) {
    console.error(
      `Usage: verify-release --package <${Object.keys(DIRECTORIES).join(
        '|',
      )}> --version <version>`,
    )
    process.exit(2)
  }
  return process.argv[index + 1]
}

const directory = argument('package')
const version = argument('version')
const target = DIRECTORIES[directory]

if (!target) {
  console.error(`Unknown package "${directory}".`)
  process.exit(2)
}

// The package under test at the exact version, the other two at whatever a
// consumer would get today. That combination is what a consumer would install.
function specifiers() {
  step(`resolve what a consumer installing ${target}@${version} would get`)
  const deps = {}

  for (const name of [CORE, DATA, REACT]) {
    if (name === target) {
      deps[name] = version
      continue
    }
    const latest = capture('npm', ['view', `${name}@latest`, 'version']).trim()
    deps[name] = latest
  }

  for (const [name, spec] of Object.entries(deps)) {
    console.log(`  ${name === target ? '→' : ' '} ${name}@${spec}`)
  }
  return deps
}

async function published() {
  step(`confirm ${target}@${version} is on the registry`)
  try {
    const found = capture('npm', [
      'view',
      `${target}@${version}`,
      'version',
    ]).trim()
    check(`${target}@${version} is published`, found === version)
  } catch {
    check(`${target}@${version} is published`, false)
    report('Nothing to verify: publish it first.')
  }

  const tags = JSON.parse(
    capture('npm', ['view', target, 'dist-tags', '--json']),
  )
  console.log(`  dist-tags: ${JSON.stringify(tags)}`)
  check(
    `${target}@${version} is not already on latest`,
    tags.latest !== version,
  )
  return tags
}

// Data is the only package the CDN resolves on a consumer's behalf: the @0.1
// pin baked into every published core picks up a new patch without a core
// release. ADR-0004 promises that; this is where it gets checked.
async function propagated() {
  if (target !== DATA) return

  step(`confirm jsDelivr serves ${version} through the ${DATA_CDN} pin`)
  const url = `${DATA_CDN}/sets/15/native.json`

  for (let attempt = 1; attempt <= 30; attempt++) {
    const response = await fetch(url, { redirect: 'follow' })
    const served = response.headers.get('x-jsd-version')
    if (response.ok && served === version) {
      check(`the @0.1 pin serves ${version}`, true)
      return
    }
    if (attempt === 30) {
      check(
        `the @0.1 pin serves ${version} (serving ${served ?? response.status})`,
        false,
      )
      return
    }
    await new Promise((wait) => setTimeout(wait, 10000))
  }
}

await rm(dirname(APP), { recursive: true, force: true })
await mkdir(APP, { recursive: true })

await published()
await propagated()

await verifyConsumerApp({
  app: APP,
  deps: specifiers(),
  checkDefaultData: true,
})

console.log('')
console.log('If every check above passed, promote it:')
console.log(`  npm dist-tag add ${target}@${version} latest`)

report(null)
