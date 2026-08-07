"use client"

import { useEffect, useState } from 'react'

export type LicenseStatus = { valid: boolean, ready: boolean }

type LicenseGlobals = {
  token: string
  key: string
}

const readGlobalLicense = (): LicenseGlobals => {
  const g = globalThis as any
  const token = typeof g.__TABLEFRONT_VALIDATION_TOKEN === 'string'
    ? g.__TABLEFRONT_VALIDATION_TOKEN
    : ''
  const key = typeof g.__TABLEFRONT_VALIDATION_KEY === 'string'
    ? g.__TABLEFRONT_VALIDATION_KEY
    : ''
  return { token, key }
}

const applyModuleGlobals = (mod: any): LicenseGlobals => {
  const token = typeof mod?.TABLEFRONT_VALIDATION_TOKEN === 'string'
    ? mod.TABLEFRONT_VALIDATION_TOKEN
    : ''
  const key = typeof mod?.TABLEFRONT_VALIDATION_KEY === 'string'
    ? mod.TABLEFRONT_VALIDATION_KEY
    : ''

  if (token && typeof globalThis !== 'undefined') {
    ;(globalThis as any).__TABLEFRONT_VALIDATION_TOKEN = token
  }
  if (key && typeof globalThis !== 'undefined') {
    ;(globalThis as any).__TABLEFRONT_VALIDATION_KEY = key
  }

  return {
    token: token || readGlobalLicense().token,
    key: key || readGlobalLicense().key,
  }
}

const loadLicenseGlobals = async (): Promise<LicenseGlobals> => {
  const existing = readGlobalLicense()
  if (existing.token) return existing

  // Prefer eager inclusion so Next.js does not park activation in an async chunk
  // that can resolve after we already decided the license is invalid.
  try {
    const mod = await import(
      /* webpackMode: "eager" */
      './license.globals.mjs'
    )
    return applyModuleGlobals(mod)
  } catch {
    return readGlobalLicense()
  }
}

export function useLicenseStatus (): LicenseStatus {
  const [status, setStatus] = useState<LicenseStatus>({ valid: false, ready: false })

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const { token } = await loadLicenseGlobals()
        if (cancelled) return

        // Public key is unused for client-side watermark checks; token.valid is enough.
        if (!token) {
          setStatus({ valid: false, ready: true })
          return
        }

        setStatus({ valid: getJwtValidFlag(token), ready: true })
      } catch {
        if (!cancelled) setStatus({ valid: false, ready: true })
      }
    })()

    return () => { cancelled = true }
  }, [])

  return status
}

function getJwtValidFlag (token?: string): boolean {
  try {
    if (!token) return false
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payloadB64u = parts[1]
    const payloadJson = base64UrlToString(payloadB64u)
    const payload = JSON.parse(payloadJson)
    return !!(payload && payload.valid === true)
  } catch {
    return false
  }
}

function base64UrlToString (b64u: string): string {
  const s = base64UrlToBase64(b64u)
  return decodeURIComponent(escape(atob(s)))
}

function base64UrlToBase64 (b64u: string): string {
  let s = b64u.replace(/-/g, '+').replace(/_/g, '/')
  const pad = s.length % 4
  if (pad === 2) s += '=='
  else if (pad === 3) s += '='
  else if (pad !== 0) s += '=='
  return s
}
