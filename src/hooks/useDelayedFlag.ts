'use client'

import { useEffect, useState } from 'react'

/**
 * Becomes true after `delayMs` while `active` stays true.
 * Clears immediately when `active` becomes false so fast loads never flash.
 */
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [isDelayed, setIsDelayed] = useState(false)

  useEffect(() => {
    if (!active) {
      setIsDelayed(false)
      return
    }

    setIsDelayed(false)
    const timeoutId = window.setTimeout(() => {
      setIsDelayed(true)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [active, delayMs])

  return active && isDelayed
}
