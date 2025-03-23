/**
 * Store interface types for the commenting feature
 */

import type { Comment, CommentDeletionResult, Comments, Thread } from './core.js'

/**
 * Interface for the CommentStore
 */
export interface CommentStoreInterface {
  /**
   * Get all comments and threads
   */
  getComments(): Comments
  
  /**
   * Add a comment or thread to the store
   */
  addComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
    offset?: number,
  ): void
  
  /**
   * Delete a comment or thread from the store
   */
  deleteCommentOrThread(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): CommentDeletionResult | null
  
  /**
   * Register a callback to be called when the store changes
   */
  registerOnChange(onChange: () => void): () => void
  
  /**
   * Load comments for a document from the Payload API
   */
  loadComments(documentId: string): Promise<void>
  
  /**
   * Save a comment or thread to the Payload API
   */
  saveComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): Promise<void>
}
