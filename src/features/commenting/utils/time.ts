/**
 * Utility functions for time formatting
 */

// Create a RelativeTimeFormat instance for formatting relative times
const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit',
  numeric: 'auto',
  style: 'short',
})

/**
 * Format a timestamp as a relative time string (e.g., "Just now", "5 min ago")
 */
export const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.round(
    (timestamp - (performance.timeOrigin + performance.now())) / 1000,
  )
  const minutes = Math.round(seconds / 60)
  return seconds > -10 ? 'Just now' : rtf.format(minutes, 'minute')
}

/**
 * Custom hook for periodically updating time displays
 * This could be implemented if we want to use React hooks
 * instead of the current counter approach
 */
