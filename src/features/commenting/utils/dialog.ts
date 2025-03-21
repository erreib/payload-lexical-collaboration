/**
 * Utility functions for dialog confirmations
 */

/**
 * Show a confirmation dialog for deleting a comment
 * @returns True if the user confirms, false otherwise
 */
export const confirmDeleteComment = (): boolean => {
  return window.confirm('Are you sure you want to delete this comment?')
}

/**
 * Show a confirmation dialog for deleting a thread
 * @returns True if the user confirms, false otherwise
 */
export const confirmDeleteThread = (): boolean => {
  return window.confirm('Are you sure you want to delete this thread?')
}
