"use client"

import { useState, useEffect } from 'react'

export function useWindowResize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  })

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Call once to set initial size
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowSize
} 