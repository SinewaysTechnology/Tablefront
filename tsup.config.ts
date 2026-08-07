import { defineConfig } from 'tsup'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const rootDir = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(rootDir, 'dist')
const stubSrc = resolve(rootDir, 'src', 'license.globals.mjs')

const isActivatedGlobals = (content: string): boolean =>
  /TABLEFRONT_VALIDATION_TOKEN\s*=\s*['"]eyJ/.test(content)

const ensureLicenseGlobals = () => {
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })

  const mjsPath = resolve(distDir, 'license.globals.mjs')
  const cjsPath = resolve(distDir, 'license.globals.cjs')
  const jsPath = resolve(distDir, 'license.globals.js')

  // Preserve tokens written by `tablefront activate` across rebuilds / watch mode
  if (existsSync(mjsPath) && isActivatedGlobals(readFileSync(mjsPath, 'utf8'))) {
    if (!existsSync(jsPath)) copyFileSync(mjsPath, jsPath)
    return
  }

  if (!existsSync(stubSrc)) return

  copyFileSync(stubSrc, mjsPath)
  copyFileSync(stubSrc, jsPath)

  const stub = readFileSync(stubSrc, 'utf8')
  const cjs = stub
    .replace(
      /export const TABLEFRONT_VALIDATION_TOKEN/g,
      'const TABLEFRONT_VALIDATION_TOKEN'
    )
    .replace(
      /export const TABLEFRONT_VALIDATION_KEY/g,
      'const TABLEFRONT_VALIDATION_KEY'
    )
    .concat('\nmodule.exports = { TABLEFRONT_VALIDATION_TOKEN, TABLEFRONT_VALIDATION_KEY }\n')
  writeFileSync(cjsPath, cjs)
}

const ensureEntryImportsGlobals = () => {
  const esmPath = resolve(distDir, 'index.js')
  if (existsSync(esmPath)) {
    const src = readFileSync(esmPath, 'utf8')
    if (!src.includes("import './license.globals.mjs'") && !src.includes('import "./license.globals.mjs"')) {
      writeFileSync(esmPath, `import './license.globals.mjs'\n` + src)
    }
  }

  const cjsPath = resolve(distDir, 'index.cjs')
  if (existsSync(cjsPath)) {
    const src = readFileSync(cjsPath, 'utf8')
    if (src.includes("require('./license.globals.cjs')") || src.includes('require("./license.globals.cjs")')) {
      return
    }
    if (src.startsWith('"use strict";') || src.startsWith("'use strict';")) {
      writeFileSync(
        cjsPath,
        src.replace(/^(['"])use strict\1;/, `$&\nrequire('./license.globals.cjs');`)
      )
      return
    }
    writeFileSync(cjsPath, `"use strict";\nrequire('./license.globals.cjs');\n` + src)
  }
}

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  external: [
    'react',
    'react-dom',
    '@tanstack/react-table',
    'zustand',
    'class-variance-authority',
    'lucide-react',
    /license\.globals(\.mjs|\.cjs|\.js)?$/,
  ],
  banner: ({ format }) => ({
    js: format === 'cjs'
      ? `"use strict";\nrequire('./license.globals.cjs');`
      : `import './license.globals.mjs';`,
  }),
  async onSuccess () {
    ensureLicenseGlobals()
    ensureEntryImportsGlobals()
    // Compile Tailwind utilities used by the package, then wire entry CSS import
    try {
      execSync('node ./scripts/build-css.mjs && node ./scripts/finalize-build.mjs', {
        cwd: rootDir,
        stdio: 'inherit',
      })
    } catch (error) {
      console.error('[tablefront] CSS finalize failed', error)
      throw error
    }
  },
})
