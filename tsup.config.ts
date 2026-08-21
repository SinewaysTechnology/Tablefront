import { defineConfig } from 'tsup'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

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
      ? `"use strict";\nrequire('./styles.css');\nrequire('./license.globals.cjs');`
      : `import './styles.css';\nimport './license.globals.mjs';`,
  }),
  async onSuccess () {
    ensureLicenseGlobals()
    try {
      for (const script of ['build-css.mjs', 'finalize-build.mjs', 'verify-package.mjs']) {
        execFileSync(process.execPath, [resolve(rootDir, 'scripts', script)], {
          cwd: rootDir,
          stdio: 'inherit',
        })
      }
    } catch (error) {
      console.error('[tablefront] package finalization failed', error)
      throw error
    }
  },
})
