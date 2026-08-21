#!/usr/bin/env node
/**
 * Fail the build if the distributable would omit Tablefront's packaged CSS.
 * This protects the auto-import contract across ESM and CommonJS consumers.
 */
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'))
const esmPath = resolve(packageRoot, 'dist', 'index.js')
const cjsPath = resolve(packageRoot, 'dist', 'index.cjs')
const cssPath = resolve(packageRoot, 'dist', 'styles.css')
const rootCssPath = resolve(packageRoot, 'styles.css')

const failures = []
const requireFile = (path, label) => {
  if (!existsSync(path)) failures.push(`${label} is missing`)
}

requireFile(esmPath, 'dist/index.js')
requireFile(cjsPath, 'dist/index.cjs')
requireFile(cssPath, 'dist/styles.css')
requireFile(rootCssPath, 'styles.css')

if (existsSync(esmPath)) {
  const esm = readFileSync(esmPath, 'utf8')
  if (!/import\s+['"]\.\/styles\.css['"]/.test(esm)) {
    failures.push('dist/index.js does not import ./styles.css')
  }
}

if (existsSync(cjsPath)) {
  const cjs = readFileSync(cjsPath, 'utf8')
  if (!/require\(['"]\.\/styles\.css['"]\)/.test(cjs)) {
    failures.push('dist/index.cjs does not require ./styles.css')
  }
}

if (existsSync(cssPath)) {
  const css = readFileSync(cssPath, 'utf8')
  if (!css.includes('[data-tablefront-root]')) {
    failures.push('dist/styles.css does not contain scoped Tablefront rules')
  }
}

if (packageJson.exports?.['./styles.css'] !== './dist/styles.css') {
  failures.push('package export ./styles.css must point to ./dist/styles.css')
}

if (!packageJson.sideEffects?.includes('dist/styles.css')) {
  failures.push('package sideEffects must include dist/styles.css')
}

if (packageJson.publishConfig?.tag !== 'latest') {
  failures.push('publishConfig.tag must be "latest" so beta releases update the default install')
}

if (packageJson.publishConfig?.access !== 'public') {
  failures.push('publishConfig.access must be "public" for the scoped package')
}

if (failures.length > 0) {
  console.error('[tablefront] package verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[tablefront] package verification passed (ESM, CJS, and scoped CSS)')
