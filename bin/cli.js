#!/usr/bin/env node
// tablefront CLI: `tablefront activate`
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, resolve } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { parse as dotenvParse } from 'dotenv'

function log (...args) { try { console.log('[tablefront]', ...args) } catch {} }
function error (...args) { try { console.error('[tablefront]', ...args) } catch {} }

function stripWrappingQuotes (value) {
  const trimmed = String(value ?? '').trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

/**
 * Load env files the way Next.js apps typically define them.
 * Important: `tablefront activate` often runs *before* `next build`, so
 * NODE_ENV may be unset — load both development and production files.
 * Existing process.env values always win.
 */
function loadEnv (cwd) {
  try {
    const mode = process.env.NODE_ENV || ''
    const files = [
      '.env',
      '.env.local',
      '.env.development',
      '.env.development.local',
      '.env.production',
      '.env.production.local',
    ]

    // If NODE_ENV is set, give that mode's files final precedence among files.
    if (mode && mode !== 'development' && mode !== 'production') {
      files.push(`.env.${mode}`, `.env.${mode}.local`)
    }

    const merged = {}
    for (const file of files) {
      const fullPath = resolve(cwd, file)
      if (!existsSync(fullPath)) continue
      try {
        Object.assign(merged, dotenvParse(readFileSync(fullPath)))
      } catch (e) {
        error(`Failed to parse ${file}:`, e?.message || e)
      }
    }

    for (const [key, value] of Object.entries(merged)) {
      if (process.env[key] === undefined) process.env[key] = value
    }
  } catch (e) {
    error('Failed to load env files:', e?.message || e)
  }
}

function getLicenseKey () {
  const raw = process.env.TABLEFRONT_LICENSE_KEY || process.env.TABLEFRONT_LICENSE || ''
  return stripWrappingQuotes(raw)
}

function writeStubGlobals () {
  const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const distDir = resolve(pkgRoot, 'dist')
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })
  const banner = '// AUTO-GENERATED: Default empty license globals stub. Overwritten by tablefront activate\n'
  const esm = `${banner}export const TABLEFRONT_VALIDATION_TOKEN = ''\nexport const TABLEFRONT_VALIDATION_KEY = ''\nif (typeof globalThis !== 'undefined') {\n  globalThis.__TABLEFRONT_VALIDATION_TOKEN = TABLEFRONT_VALIDATION_TOKEN\n  globalThis.__TABLEFRONT_VALIDATION_KEY = TABLEFRONT_VALIDATION_KEY\n}\n`
  const cjs = `${banner}const TABLEFRONT_VALIDATION_TOKEN = ''\nconst TABLEFRONT_VALIDATION_KEY = ''\nif (typeof globalThis !== 'undefined') {\n  globalThis.__TABLEFRONT_VALIDATION_TOKEN = TABLEFRONT_VALIDATION_TOKEN\n  globalThis.__TABLEFRONT_VALIDATION_KEY = TABLEFRONT_VALIDATION_KEY\n}\nmodule.exports = { TABLEFRONT_VALIDATION_TOKEN, TABLEFRONT_VALIDATION_KEY }\n`
  writeFileSync(resolve(distDir, 'license.globals.mjs'), esm)
  writeFileSync(resolve(distDir, 'license.globals.cjs'), cjs)
  writeFileSync(resolve(distDir, 'license.globals.js'), esm)
}

function ensureEntryImportsGlobals (distDir) {
  const esmCandidates = [
    resolve(distDir, 'index.mjs'),
    resolve(distDir, 'index.js'),
  ]
  for (const indexEsm of esmCandidates) {
    if (!existsSync(indexEsm)) continue
    const src = readFileSync(indexEsm, 'utf8')
    if (!src.includes("import './license.globals.mjs'") && !src.includes('import "./license.globals.mjs"')) {
      writeFileSync(indexEsm, `import './license.globals.mjs'\n` + src)
    }
    break
  }

  const cjsIndex = resolve(distDir, 'index.cjs')
  if (existsSync(cjsIndex)) {
    const src = readFileSync(cjsIndex, 'utf8')
    if (src.includes("require('./license.globals.cjs')") || src.includes('require("./license.globals.cjs")')) {
      return
    }
    if (src.startsWith('"use strict";') || src.startsWith("'use strict';")) {
      writeFileSync(
        cjsIndex,
        src.replace(/^(['"])use strict\1;/, `$&\nrequire('./license.globals.cjs');`)
      )
      return
    }
    writeFileSync(cjsIndex, `"use strict";\nrequire('./license.globals.cjs');\n` + src)
  }
}

export async function activate () {
  const cwd = process.cwd()
  const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const distDir = resolve(pkgRoot, 'dist')
  const validatorPath = resolve(pkgRoot, 'src', 'tools', 'validator.min.mjs')

  loadEnv(cwd)
  const key = getLicenseKey()

  const writeGlobals = (token, pub) => {
    if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })
    const banner = '// AUTO-GENERATED: Do not edit. Created by tablefront CLI\n'
    const esm = `${banner}export const TABLEFRONT_VALIDATION_TOKEN = ${JSON.stringify(token)}\nexport const TABLEFRONT_VALIDATION_KEY = ${JSON.stringify(pub)}\nif (typeof globalThis !== 'undefined') {\n  globalThis.__TABLEFRONT_VALIDATION_TOKEN = TABLEFRONT_VALIDATION_TOKEN\n  globalThis.__TABLEFRONT_VALIDATION_KEY = TABLEFRONT_VALIDATION_KEY\n}\n`
    const cjs = `${banner}const TABLEFRONT_VALIDATION_TOKEN = ${JSON.stringify(token)}\nconst TABLEFRONT_VALIDATION_KEY = ${JSON.stringify(pub)}\nif (typeof globalThis !== 'undefined') {\n  globalThis.__TABLEFRONT_VALIDATION_TOKEN = TABLEFRONT_VALIDATION_TOKEN\n  globalThis.__TABLEFRONT_VALIDATION_KEY = TABLEFRONT_VALIDATION_KEY\n}\nmodule.exports = { TABLEFRONT_VALIDATION_TOKEN, TABLEFRONT_VALIDATION_KEY }\n`
    writeFileSync(resolve(distDir, 'license.globals.mjs'), esm)
    writeFileSync(resolve(distDir, 'license.globals.cjs'), cjs)
    // Some bundlers resolve the side-effect import as .js
    writeFileSync(resolve(distDir, 'license.globals.js'), esm)
    ensureEntryImportsGlobals(distDir)
  }

  try {
    if (!key) {
      writeGlobals('', '')
      log('License key not found. You can still use Tablefront, but a watermark will appear.')
      log('Looked for TABLEFRONT_LICENSE / TABLEFRONT_LICENSE_KEY in process.env and .env* files under:', cwd)
      log('To activate, add TABLEFRONT_LICENSE="your-license-key-here" to your .env (or .env.production) file and add "tablefront activate" to your package.json build script (for example: "build": "tablefront activate && next build").')
      log("If you don't have a license key yet, you can purchase one at https://tablefront.sineways.tech/")
      process.exit(0)
    }

    if (!existsSync(validatorPath)) {
      writeGlobals('', '')
      error('License validator missing at', validatorPath)
      process.exit(0)
    }

    const { decodeAndValidateLicense } = await import(pathToFileURL(validatorPath).href)
    const res = await decodeAndValidateLicense(key)
    if (res?.valid && res?.validationToken && res?.validationPublicKeyB64u) {
      writeGlobals(res.validationToken, res.validationPublicKeyB64u)
      log('License key valid.')
      process.exit(0)
    }

    writeGlobals('', '')
    log('License key is invalid. You can still use Tablefront, but a watermark will appear.')
    log('To fix this, verify your key, add TABLEFRONT_LICENSE="your-license-key-here" to your .env file, and add "tablefront activate" to your package.json build script (for example, as a "prebuild" step).')
    log("If you don't have a license key yet, you can purchase one at https://tablefront.sineways.tech/")
    process.exit(0)
  } catch (e) {
    writeGlobals('', '')
    error('Activation error:', e?.message || e)
    error('Wrote empty license globals (watermark will show).')
    process.exit(0)
  }
}

async function main () {
  const sub = process.argv[2]
  if (sub === 'activate') return activate()
  if (sub === 'stub' || sub === 'ensure' || sub === 'ensure-stub') {
    try { writeStubGlobals(); log('Ensured default license globals stub.') } catch (e) {
      error('Failed to write stub:', e?.message || e)
    }
    process.exit(0)
  }
  console.log('Usage: tablefront activate | tablefront stub')
  process.exit(0)
}

main()
