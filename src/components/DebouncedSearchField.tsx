import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

export type DebouncedSearchFieldProps = {
  committedValue: string
  onCommit: (value: string) => void
  debounceMs: number
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  className?: string
  ariaLabel?: string
  ClearSearchBtn?: React.ComponentType<any>
  clearButtonClassName?: string
  clearButtonIcon?: React.ReactNode
}

export const DebouncedSearchField = React.memo(({
  committedValue,
  onCommit,
  debounceMs,
  onKeyDown,
  placeholder,
  inputRef,
  className,
  ariaLabel,
  ClearSearchBtn,
  clearButtonClassName,
  clearButtonIcon,
}: DebouncedSearchFieldProps) => {
  const [draftValue, setDraftValue] = useState(committedValue)
  const draftValueRef = useRef(committedValue)
  const committedValueRef = useRef(committedValue)
  const onCommitRef = useRef(onCommit)
  const pendingCommitRef = useRef(false)
  const isFocusedRef = useRef(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  draftValueRef.current = draftValue
  committedValueRef.current = committedValue
  onCommitRef.current = onCommit

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current === null) return
    clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = null
  }, [])

  const flushCommit = useCallback((value: string) => {
    clearDebounceTimer()
    pendingCommitRef.current = false
    if (value === committedValueRef.current) return
    onCommitRef.current(value)
  }, [clearDebounceTimer])

  useEffect(() => {
    return () => {
      clearDebounceTimer()
    }
  }, [clearDebounceTimer])

  useEffect(() => {
    if (pendingCommitRef.current) return
    if (isFocusedRef.current && draftValueRef.current !== committedValue) return
    setDraftValue(committedValue)
  }, [committedValue])

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value
    pendingCommitRef.current = true
    setDraftValue(nextValue)
    clearDebounceTimer()
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      flushCommit(nextValue)
    }, debounceMs)
  }, [clearDebounceTimer, debounceMs, flushCommit])

  const handleClear = useCallback(() => {
    setDraftValue('')
    flushCommit('')
    inputRef?.current?.focus()
  }, [flushCommit, inputRef])

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true
  }, [])

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false
    flushCommit(draftValueRef.current)
  }, [flushCommit])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      flushCommit(draftValueRef.current)
    }

    if (event.key === 'Escape' && draftValueRef.current) {
      setDraftValue('')
      flushCommit('')
    }

    onKeyDown?.(event)
  }, [flushCommit, onKeyDown])

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={draftValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        aria-label={ariaLabel}
        title="Search"
        autoComplete="off"
        spellCheck={false}
        suppressHydrationWarning
      />

      {draftValue && ClearSearchBtn && (
        <ClearSearchBtn
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className={clearButtonClassName}
        >
          {clearButtonIcon}
        </ClearSearchBtn>
      )}
    </>
  )
})

DebouncedSearchField.displayName = 'DebouncedSearchField'
