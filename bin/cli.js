#!/usr/bin/env node
// tablefront CLI: `tablefront activate`
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, resolve } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { parse as dotenvParse } from 'dotenv'

function log (...args) { try { console.log('[tablefront]', ...args) } catch {} }
function error (...args) { try { console.error('[tablefront]', ...args) } catch {} }

function loadEnv (cwd) {
  try {
    const env = resolve(cwd, '.env')
    const envLocal = resolve(cwd, '.env.local')
    const base = existsSync(env) ? dotenvParse(readFileSync(env)) : {}
    const local = existsSync(envLocal) ? dotenvParse(readFileSync(envLocal)) : {}
    const merged = { ...base, ...local }
    for (const k of Object.keys(merged)) {
      if (process.env[k] === undefined) process.env[k] = merged[k]
    }
  } catch {}
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
}

export async function activate () {
  const cwd = process.cwd()
  const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const distDir = resolve(pkgRoot, 'dist')
  // Resolve validator from source; it is NOT shipped to the browser
  const validatorPath = resolve(pkgRoot, 'src', 'tools', 'validator.min.mjs')

  loadEnv(cwd)
  const key = process.env.TABLEFRONT_LICENSE_KEY || process.env.TABLEFRONT_LICENSE || ''

  const writeGlobals = (token, pub, reason) => {
    if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })
    const banner = '// AUTO-GENERATED: Do not edit. Created by tablefront CLI\n'
    const esm = `${banner}export const TABLEFRONT_VALIDATION_TOKEN = ${JSON.stringify(token)}\nexport const TABLEFRONT_VALIDATION_KEY = ${JSON.stringify(pub)}\nif (typeof globalThis !== 'undefined') {\n  globalThis.__TABLEFRONT_VALIDATION_TOKEN = TABLEFRONT_VALIDATION_TOKEN\n  globalThis.__TABLEFRONT_VALIDATION_KEY = TABLEFRONT_VALIDATION_KEY\n}\n`
    const cjs = `${banner}const TABLEFRONT_VALIDATION_TOKEN = ${JSON.stringify(token)}\nconst TABLEFRONT_VALIDATION_KEY = ${JSON.stringify(pub)}\nif (typeof globalThis !== 'undefined') {\n  globalThis.__TABLEFRONT_VALIDATION_TOKEN = TABLEFRONT_VALIDATION_TOKEN\n  globalThis.__TABLEFRONT_VALIDATION_KEY = TABLEFRONT_VALIDATION_KEY\n}\nmodule.exports = { TABLEFRONT_VALIDATION_TOKEN, TABLEFRONT_VALIDATION_KEY }\n`
    writeFileSync(resolve(distDir, 'license.globals.mjs'), esm)
    writeFileSync(resolve(distDir, 'license.globals.cjs'), cjs)

    // Patch ESM entry to import globals. Prefer index.mjs; fallback to index.js (ESM)
    const esmCandidates = [
      resolve(distDir, 'index.mjs'),
      resolve(distDir, 'index.js')
    ]
    for (const indexEsm of esmCandidates) {
      if (!existsSync(indexEsm)) continue
      const src = readFileSync(indexEsm, 'utf8')
      if (!src.startsWith("import './license.globals.mjs'")) {
        writeFileSync(indexEsm, `import './license.globals.mjs'\n` + src)
      }
      break
    }
    // Patch CJS entry to require globals
    const cjsIndex = resolve(distDir, 'index.cjs')
    if (existsSync(cjsIndex)) {
      const src = readFileSync(cjsIndex, 'utf8')
      if (!src.startsWith("require('./license.globals.cjs')")) {
        writeFileSync(cjsIndex, `require('./license.globals.cjs')\n` + src)
      }
    }
    // No CJS patch or file — keep a single ESM globals module
    // log(reason, { file: resolve(distDir, 'license.globals.mjs') })
  }

  try {
    // Handle missing key with a friendly, actionable message
    if (!key || String(key).trim() === '') {
      writeGlobals('', '', 'Activation skipped: missing license (watermark).')
      log('License key not found. You can still use Tablefront, but a watermark will appear.')
      log('To activate, add TABLEFRONT_LICENSE="your-license-key-here" to your .env file and add "tablefront activate" to your package.json build script (for example: "build": "tablefront activate && next build").')
      log("If you don't have a license key yet, you can purchase one at https://tablefront.sineways.tech/")
      process.exit(0)
    }

    const { decodeAndValidateLicense } = await import(pathToFileURL(validatorPath).href)
    const res = await decodeAndValidateLicense(key)
    if (res?.valid && res?.validationToken && res?.validationPublicKeyB64u) {
      writeGlobals(res.validationToken, res.validationPublicKeyB64u, 'Activated: license key valid.')
      log('License key valid.')
      process.exit(0)
    }
    // Invalid key provided
    writeGlobals('', '', 'Activation skipped: invalid license (watermark).')
    log('License key is invalid. You can still use Tablefront, but a watermark will appear.')
    log('To fix this, verify your key, add TABLEFRONT_LICENSE="your-license-key-here" to your .env file, and add "tablefront activate" to your package.json build script (for example, as a "prebuild" step).')
    log("If you don't have a license key yet, you can purchase one at https://tablefront.sineways.tech/")
    process.exit(0)
  } catch (e) {
    writeGlobals('', '', 'Activation error: wrote empty globals (watermark will show).')
    process.exit(0)
  }
}

async function main () {
  const sub = process.argv[2]
  if (sub === 'activate') return activate()
  if (sub === 'stub' || sub === 'ensure' || sub === 'ensure-stub') {
    try { writeStubGlobals(); log('Ensured default license globals stub.') } catch {}
    process.exit(0)
  }
  console.log('Usage: tablefront activate | tablefront stub')
  process.exit(0)
}

main()


