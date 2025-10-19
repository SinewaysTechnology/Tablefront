"use client"

import { useEffect, useState } from 'react'

export type LicenseStatus = { valid: boolean, ready: boolean }

// No client-side validation calls; activation writes globals ahead of time

export function useLicenseStatus (): LicenseStatus {
  const [status, setStatus] = useState<LicenseStatus>({ valid: false, ready: false })

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Ensure globals are loaded in source builds (no-op if missing)
        try { await import('../dist/license.globals.mjs') } catch {}

        // Read globals
        let token: string | undefined = (globalThis as any).__TABLEFRONT_VALIDATION_TOKEN
        let publicKeyB64u: string | undefined = (globalThis as any).__TABLEFRONT_VALIDATION_KEY

        // If globals are missing, mark as ready=false->true with valid=false
        if (!token || !publicKeyB64u) {
          if (!cancelled) setStatus({ valid: false, ready: true })
          return
        }

        // Derive validity by decoding JWT payload ({ valid: true })
        const derivedValid = getJwtValidFlag(token)
        if (!cancelled) setStatus({ valid: derivedValid, ready: true })
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


