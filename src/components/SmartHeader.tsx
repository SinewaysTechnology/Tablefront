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
  
  // Check column width and update text visibility
  const checkWidth = React.useCallback(() => {
    const currentWidth = getCurrentColumnWidth(columnId)
    const shouldShow = shouldShowHeaderText(currentWidth)
    setShowText(shouldShow)
  }, [columnId])
  
  // Check width on mount, when resize state changes, and on window resize
  React.useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(checkWidth, 0)
    return () => clearTimeout(timer)
  }, [checkWidth, resizeState.isResizing])
  
  // Listen for window resize events to recheck header visibility
  React.useEffect(() => {
    const handleResize = () => {
      // Debounce the resize check
      const timer = setTimeout(checkWidth, 100)
      return () => clearTimeout(timer)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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