"use client"

import React, { useEffect } from 'react'
import { useLicenseStatus } from '../licensing'
import { mountWatermarkTo, unmountWatermarkFrom } from '../watermark'
// Ensure globals module executes when this component is bundled/loaded

export type LicenseEnforcerProps = {
  containerRef: React.RefObject<HTMLElement | null>
  watermarkText?: string
}

export function LicenseEnforcer ({ containerRef, watermarkText = 'Sineways Tablefront' }: LicenseEnforcerProps) {
  const license = useLicenseStatus()

  useEffect(() => {
    const container = containerRef.current
    // console.log('Mounting' , license)
    if (!container || !license?.ready) return
    if (!license.valid) {
      mountWatermarkTo(container, watermarkText)
    } else {
      unmountWatermarkFrom(container)
    }
    return () => { if (container) unmountWatermarkFrom(container) }
  }, [license?.ready, license?.valid, containerRef, watermarkText])

  // Log browser console error when license is missing or invalid
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


