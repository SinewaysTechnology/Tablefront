import React from 'react'
import type { SmartHeaderProps } from '../types/DataTableTypes'
import { 
  shouldShowHeaderText, 
  truncateHeaderText, 
  getCurrentColumnWidth 
} from '../utils'

/**
 * Smart header component that auto-truncates text when column gets too narrow
 */
export function SmartHeader({ 
  text, 
  columnId, 
  sortIcon, 
  isHeaderEmpty, 
  resizeState, 
  headerAlignment 
}: SmartHeaderProps) {
  const [showText, setShowText] = React.useState(true)
  const wasResizingRef = React.useRef(false)
  
  // Check column width and update text visibility
  const checkWidth = React.useCallback(() => {
    const currentWidth = getCurrentColumnWidth(columnId)
    const shouldShow = shouldShowHeaderText(currentWidth)
    setShowText((prev) => (prev === shouldShow ? prev : shouldShow))
  }, [columnId])
  
  // Remeasure after a resize drag ends (skip the start flip — width hasn't changed yet)
  React.useEffect(() => {
    const isResizing = resizeState.isResizing
    if (wasResizingRef.current && !isResizing) {
      const timer = setTimeout(checkWidth, 0)
      wasResizingRef.current = isResizing
      return () => clearTimeout(timer)
    }
    wasResizingRef.current = isResizing
  }, [checkWidth, resizeState.isResizing])

  React.useEffect(() => {
    const timer = setTimeout(checkWidth, 0)
    return () => clearTimeout(timer)
  }, [checkWidth])
  
  // Listen for window resize events to recheck header visibility
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const handleResize = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(checkWidth, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (timer) clearTimeout(timer)
    }
  }, [checkWidth])
  
  // If there's no text to show anyway, just render the icon
  if (isHeaderEmpty || !text) {
    return (
      <div 
        className="flex items-center w-full"
        style={{
          justifyContent: headerAlignment === 'center' ? 'center' : headerAlignment === 'right' ? 'flex-end' : 'flex-start'
        }}
      >
        {sortIcon && (
          <div className="flex-shrink-0">
            {sortIcon}
          </div>
        )}
      </div>
    )
  }
  
  // Always render the container, but conditionally show text
  return (
    <div 
      className="flex items-center w-full"
      style={{
        justifyContent: headerAlignment === 'center' ? 'center' : headerAlignment === 'right' ? 'flex-end' : 'flex-start'
      }}
    >
      {showText && (
        <span 
          className="truncate min-w-0 mr-1"
          title={text.length > 15 ? text : undefined}
        >
          {truncateHeaderText(text)}
        </span>
      )}
      {sortIcon && (
        <div className="flex-shrink-0">
          {sortIcon}
        </div>
      )}
    </div>
  )
} 