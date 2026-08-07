"use client"

import React, { useLayoutEffect, useEffect, useState } from 'react'
import { useLicenseStatus } from '../licensing'
import { mountWatermarkTo, unmountWatermarkFrom } from '../watermark'

export type LicenseEnforcerProps = {
  containerRef: React.RefObject<HTMLElement | null>
  watermarkText?: string
}

export function LicenseEnforcer ({ containerRef, watermarkText = 'Sineways Tablefront' }: LicenseEnforcerProps) {
  const license = useLicenseStatus()
  const [container, setContainer] = useState<HTMLElement | null>(null)

  // Re-read the ref when license state updates; refs are populated after commit
  // and license resolution is async, so a single mount read is not enough.
  useLayoutEffect(() => {
    setContainer(containerRef.current)
  }, [containerRef, license?.ready, license?.valid])

  useEffect(() => {
    if (!container || !license?.ready) return

    if (!license.valid) {
      mountWatermarkTo(container, watermarkText)
    } else {
      unmountWatermarkFrom(container)
    }

    return () => { unmountWatermarkFrom(container) }
  }, [license?.ready, license?.valid, container, watermarkText])

  useEffect(() => {
    if (!license?.ready) return
    if (license.valid) return
    try {
      console.error(
        '[tablefront]',
        `License key not found or invalid. You can still use Tablefront, but a watermark will appear.

To activate, add TABLEFRONT_LICENSE="your-license-key-here" to your .env file and add "tablefront activate" to your package.json build script (for example: "build": "tablefront activate && next build").

If you do not have a license key yet, you can purchase one at https://tablefront.sineways.tech/`
      )
    } catch {}
  }, [license?.ready, license?.valid])

  return null
}
