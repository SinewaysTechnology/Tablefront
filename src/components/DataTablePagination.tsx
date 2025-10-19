import React from 'react'
import type { DataTableIcons } from '../types/DataTableTypes'

/**
 * Props for the DataTablePagination component
 */
export interface DataTablePaginationProps {
  // Table instance
  table: any
  
  // Pagination state
  isUsingPagination: boolean
  normalRowsLength: number
  
  // UI components
  PaginationBtn: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>> | React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>>
  
  // Styling
  tableStyles: {
    pagination: {
      container: string
      controls: string
      button: string
      buttonIcon: string
      info: string
      buttonGroup: string
    }
  }
  
  // Icons
  icons: DataTableIcons
}

/**
 * DataTablePagination - Handles pagination controls and display
 */
export function DataTablePagination({
  table,
  isUsingPagination,
  normalRowsLength,
  PaginationBtn,
  tableStyles,
  icons
}: DataTablePaginationProps) {
  // Don't render if not using pagination or no rows
  if (!isUsingPagination || normalRowsLength === 0) {
    return null
  }

  const currentPage = table.getState().pagination.pageIndex + 1
  const totalPages = table.getPageCount()
  const canPreviousPage = table.getCanPreviousPage()
  const canNextPage = table.getCanNextPage()

  // Check if using version2 pagination style
  const isVersion2 = (tableStyles.pagination as { variant?: string }).variant === "version2"

  if (isVersion2) {
    return (
      <div className={tableStyles.pagination.container}>
        <div className={tableStyles.pagination.controls}>
          <PaginationBtn
            className={tableStyles.pagination.button}
            onClick={() => table.previousPage()}
            disabled={!canPreviousPage}
          >
            {icons.PaginationPrevious && (
              <icons.PaginationPrevious className={tableStyles.pagination.buttonIcon} />
            )}
          </PaginationBtn>
          
          <span className={tableStyles.pagination.info}>
            {currentPage} / {totalPages}
          </span>
          
          <PaginationBtn
            className={tableStyles.pagination.button}
            onClick={() => table.nextPage()}
            disabled={!canNextPage}
          >
            {icons.PaginationNext && (
              <icons.PaginationNext className={tableStyles.pagination.buttonIcon} />
            )}
          </PaginationBtn>
        </div>
      </div>
    )
  }

  // Default pagination style
  return (
    <div className={tableStyles.pagination.container}>
      <div className={tableStyles.pagination.info}>
        Page {currentPage} of {totalPages}
      </div>
      <div className={tableStyles.pagination.controls}>
        <div className={tableStyles.pagination.buttonGroup}>
          <PaginationBtn
            className={tableStyles.pagination.button}
            onClick={() => table.previousPage()}
            disabled={!canPreviousPage}
          >
            {icons.PaginationPrevious && (
              <icons.PaginationPrevious className={tableStyles.pagination.buttonIcon} />
            )}
          </PaginationBtn>
          <PaginationBtn
            className={tableStyles.pagination.button}
            onClick={() => table.nextPage()}
            disabled={!canNextPage}
          >
            {icons.PaginationNext && (
              <icons.PaginationNext className={tableStyles.pagination.buttonIcon} />
            )}
          </PaginationBtn>
        </div>
      </div>
    </div>
  )
}

/**
 * PaginationInfo component for standalone use
 */
export function PaginationInfo({
  currentPage,
  totalPages,
  tableStyles
}: {
  currentPage: number
  totalPages: number
  tableStyles: DataTablePaginationProps['tableStyles']
}) {
  return (
    <div className={tableStyles.pagination.info}>
      Page {currentPage} of {totalPages}
    </div>
  )
}

/**
 * PaginationControls component for standalone use
 */
export function PaginationControls({
  onPrevious,
  onNext,
  canPrevious,
  canNext,
  PaginationBtn,
  tableStyles,
  icons
}: {
  onPrevious: () => void
  onNext: () => void
  canPrevious: boolean
  canNext: boolean
  PaginationBtn: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  tableStyles: DataTablePaginationProps['tableStyles']
  icons: DataTableIcons
}) {
  return (
    <div className={tableStyles.pagination.controls}>
      <div className={tableStyles.pagination.buttonGroup}>
        <PaginationBtn
          className={tableStyles.pagination.button}
          onClick={onPrevious}
          disabled={!canPrevious}
        >
          {icons.PaginationPrevious && (
            <icons.PaginationPrevious className={tableStyles.pagination.buttonIcon} />
          )}
        </PaginationBtn>
        <PaginationBtn
          className={tableStyles.pagination.button}
          onClick={onNext}
          disabled={!canNext}
        >
          {icons.PaginationNext && (
            <icons.PaginationNext className={tableStyles.pagination.buttonIcon} />
          )}
        </PaginationBtn>
      </div>
    </div>
  )
} 