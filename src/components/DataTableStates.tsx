import React from 'react'
import type { DataTableIcons } from '../types/DataTableTypes'

/**
 * Props for the DataTableStates component
 */
export interface DataTableStatesProps {
  // State flags
  showLoadingState: boolean
  showEmptyState: boolean
  isLoading: boolean
  
  // Text content
  loadingText: string
  emptyStateText: string
  
  // Styling
  tableStyles: {
    loadingState: {
      container: string
      content: string
      icon: string
      text: string
    }
    emptyState: {
      container: string
      content: string
      text: string
    }
  }
  
  // Icons
  icons: DataTableIcons
}

/**
 * DataTableStates - Handles loading, empty, and error states
 */
export function DataTableStates({
  showLoadingState,
  showEmptyState,
  isLoading,
  loadingText,
  emptyStateText,
  tableStyles,
  icons
}: DataTableStatesProps) {
  // Don't render anything if no states are active
  if (!showLoadingState && !showEmptyState) {
    return null
  }

  // Show loading state
  if (showLoadingState || isLoading) {
    return (
      <div
        className={tableStyles.loadingState.container}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className={tableStyles.loadingState.content}>
          <div className="flex items-center justify-center">
            {icons.Loader && <icons.Loader className={tableStyles.loadingState.icon} />}
          </div>
          <div className={tableStyles.loadingState.text}>{loadingText}</div>
        </div>
      </div>
    )
  }

  // Show empty state
  if (showEmptyState) {
    return (
      <div className={tableStyles.emptyState.container}>
        <div className={tableStyles.emptyState.content}>
          <div className={tableStyles.emptyState.text}>{emptyStateText}</div>
        </div>
      </div>
    )
  }

  return null
}

/**
 * LoadingState component for standalone use
 */
export function LoadingState({
  text = 'Loading...',
  tableStyles,
  icons
}: {
  text?: string
  tableStyles: DataTableStatesProps['tableStyles']
  icons: DataTableIcons
}) {
  return (
    <div
      className={tableStyles.loadingState.container}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={tableStyles.loadingState.content}>
        <div className="flex items-center justify-center">
          {icons.Loader && <icons.Loader className={tableStyles.loadingState.icon} />}
        </div>
        <div className={tableStyles.loadingState.text}>{text}</div>
      </div>
    </div>
  )
}

/**
 * EmptyState component for standalone use
 */
export function EmptyState({
  text = 'No items found',
  tableStyles
}: {
  text?: string
  tableStyles: DataTableStatesProps['tableStyles']
}) {
  return (
    <div className={tableStyles.emptyState.container}>
      <div className={tableStyles.emptyState.content}>
        <div className={tableStyles.emptyState.text}>{text}</div>
      </div>
    </div>
  )
} 