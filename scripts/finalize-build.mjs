#!/usr/bin/env node
/**
 * After JS + CSS builds: ensure the package entry auto-imports styles.css
 * so consumers get styles without a separate CSS import.
 */
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const rootDir = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(rootDir, '..')
const distDir = resolve(pkgRoot, 'dist')
const distCss = resolve(distDir, 'styles.css')
const rootCss = resolve(pkgRoot, 'styles.css')

const ensureCssExportAlias = () => {
  if (!existsSync(distCss)) {
    console.warn('[tablefront] dist/styles.css missing — skip CSS export alias')
    return
  }
  // Keep root styles.css as a compiled alias for `./styles.css` consumers / docs.
  copyFileSync(distCss, rootCss)
}

const injectCssImport = () => {
  if (!existsSync(distCss)) return

  const esmPath = resolve(distDir, 'index.js')
  if (existsSync(esmPath)) {
    const src = readFileSync(esmPath, 'utf8')
    if (!src.includes("import './styles.css'") && !src.includes('import "./styles.css"')) {
      writeFileSync(esmPath, `import './styles.css'\n` + src)
    }
  }

  const cjsPath = resolve(distDir, 'index.cjs')
  if (existsSync(cjsPath)) {
    const src = readFileSync(cjsPath, 'utf8')
    if (src.includes("require('./styles.css')") || src.includes('require("./styles.css")')) {
      return
    }
    if (src.startsWith('"use strict";') || src.startsWith("'use strict';")) {
      writeFileSync(
        cjsPath,
        src.replace(/^(['"])use strict\1;/, `$&\nrequire('./styles.css');`),
      )
      return
    }
    writeFileSync(cjsPath, `"use strict";\nrequire('./styles.css');\n` + src)
  }
}

ensureCssExportAlias()
injectCssImport()
console.log('[tablefront] styles bundled and entry imports wired')
