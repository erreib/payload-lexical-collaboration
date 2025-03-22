'use client'

import { Comment, Thread } from '../types.js'

/**
 * Checks if a comment already exists in a thread
 * @param thread The thread to check
 * @param comment The comment to check for
 * @returns True if the comment already exists in the thread, false otherwise
 */
export function isCommentDuplicateInThread(thread: Thread, comment: Comment): boolean {
  return thread.comments.some(c => c.id === comment.id);
}

/**
 * Checks if a thread already exists in a list of comments
 * @param comments The list of comments to check
 * @param thread The thread to check for
 * @returns True if the thread already exists, false otherwise
 */
export function isThreadDuplicate(comments: (Comment | Thread)[], thread: Thread): boolean {
  return comments.some(c => 
    c.type === 'thread' && c.id === thread.id
  );
}

/**
 * Creates a standard error response object
 * @param message The error message
 * @param details Additional error details
 * @returns A standardized error object
 */
export function createErrorResponse(message: string, details?: any): { error: string; details?: any } {
  return {
    error: message,
    ...(details ? { details } : {})
  };
}
