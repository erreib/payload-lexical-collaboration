/**
 * Hook return types for the commenting feature
 */

import type { NodeKey } from '@payloadcms/richtext-lexical/lexical'
import type { Comment, CommentDeletionResult, Thread } from './core.js'

/**
 * Return type for useCommentOperations hook
 */
export type CommentOperationsResult = {
  /**
   * Delete a comment or thread
   */
  deleteCommentOrThread: (
    comment: Comment | Thread, 
    thread?: Thread
  ) => Promise<CommentDeletionResult | null>
  
  /**
   * Submit a new comment
   */
  submitAddComment: (
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
    selection?: any,
  ) => Promise<void>
}

/**
 * Return type for useDocumentOperations hook
 */
export type DocumentOperationsResult = {
  /**
   * Whether the document is saved
   */
  isDocumentSaved: boolean
  
  /**
   * Set whether the document is saved
   */
  setIsDocumentSaved: (saved: boolean) => void
  
  /**
   * Check if the document exists
   */
  checkIfDocumentExists: () => Promise<boolean>
  
  /**
   * Save the document
   */
  saveDocument: () => Promise<boolean>
}

/**
 * Return type for useCommentCommands hook
 */
export type CommentCommandsResult = {
  /**
   * Cancel adding a comment
   */
  cancelAddComment: () => void
  
  /**
   * Add a comment
   */
  onAddComment: () => void
  
  /**
   * Toggle showing comments
   */
  toggleComments: () => void
}

/**
 * Return type for useCommentMarks hook
 */
export type CommentMarksResult = {
  /**
   * Map of mark node keys to IDs
   */
  markNodeMap: Map<string, Set<NodeKey>>
  
  /**
   * Active comment IDs
   */
  activeIDs: string[]
  
  /**
   * Active anchor key
   */
  activeAnchorKey: NodeKey | null
}
