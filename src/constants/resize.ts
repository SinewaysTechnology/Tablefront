/**
 * Column resize timing constants
 */

// Default delay to detect double-click after resize end
export const DEFAULT_RESIZE_DOUBLE_CLICK_DELAY = 150 // ms

// Default debounce time for reset flag clearing
export const DEFAULT_RESIZE_RESET_DEBOUNCE = 50 // ms

// Configuration interface for resize timing
export interface ResizeTimingConfig {
  doubleClickDelay?: number // ms - delay to detect double-click after resize end
  resetDebounce?: number    // ms - debounce for reset flag clearing
} 