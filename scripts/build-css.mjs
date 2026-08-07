#!/usr/bin/env node
/**
 * Compile styles.source.css → dist/styles.css (standalone, no preflight).
 * Uses the PostCSS API directly — postcss-cli does not reliably run @tailwindcss/postcss.
 */
import { createRequire } from 'module'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const postcss = require('postcss')
const tailwind = require('@tailwindcss/postcss')
const selectorParser = require('postcss-selector-parser')

const ROOT_ATTRIBUTE = 'data-tablefront-root'
const ROOT_SELECTOR = `[${ROOT_ATTRIBUTE}]`

/**
 * Keep bundled Tailwind utilities inside Tablefront.
 *
 * A CSS import from a route chunk remains loaded after client-side navigation.
 * Unscoped utilities such as `.flex`, `.p-4`, and theme variables would
 * otherwise keep overriding the host app until a full refresh.
 *
 * Important: skip nested `&` rules — Tailwind v4 emits variant CSS as
 * `.hover\:x { &:hover { … } }`. Scoping the nested rule would break hover.
 */
const scopeTablefrontCss = () => ({
  postcssPlugin: 'scope-tablefront-css',
  OnceExit(root) {
    root.walkRules((rule) => {
      if (!rule.selector) return

      // Nested relative selectors must stay relative to their already-scoped parent
      if (rule.selector.includes('&')) return

      // Idempotent — never scope the same rule twice
      if (rule.selector.includes(ROOT_SELECTOR)) return

      const keyframesParent =
        rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)
      if (keyframesParent) return

      rule.selector = selectorParser((selectors) => {
        selectors.each((selector) => {
          let targetsRoot = false

          selector.walkPseudos((pseudo) => {
            if (pseudo.value !== ':root' && pseudo.value !== ':host') return
            pseudo.replaceWith(selectorParser.attribute({ attribute: ROOT_ATTRIBUTE }))
            targetsRoot = true
          })

          if (targetsRoot) return

          selector.prepend(selectorParser.combinator({ value: ' ' }))
          selector.prepend(selectorParser.attribute({ attribute: ROOT_ATTRIBUTE }))
        })
      }).processSync(rule.selector)
    })
  },
})

scopeTablefrontCss.postcss = true

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const inputPath = resolve(rootDir, 'styles.source.css')
const outDir = resolve(rootDir, 'dist')
const outputPath = resolve(outDir, 'styles.css')

if (!existsSync(inputPath)) {
  console.error('[tablefront] missing styles.source.css')
  process.exit(1)
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

const css = readFileSync(inputPath, 'utf8')
const result = await postcss([tailwind(), scopeTablefrontCss()]).process(css, {
  from: inputPath,
  to: outputPath,
})

writeFileSync(outputPath, result.css)
console.log(`[tablefront] wrote ${outputPath} (${result.css.length} bytes)`)
