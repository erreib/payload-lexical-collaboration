'use client'

import type { LexicalEditor } from '@payloadcms/richtext-lexical/lexical'
import type { Comment, CommentDeletionResult, Comments, Thread } from './types/core.js'
import type { CommentStoreInterface } from './types/store.js'
import { cloneThread, markDeleted } from './utils/factory.js'
import { commentService } from './api/commentService.js'
import { isCommentDuplicateInThread, isThreadDuplicate } from './utils/comments.js'
import { getDocumentIdFromUrl } from './utils/url.js'
import { withErrorHandling } from './utils/errorHandling.js'

/**
 * Helper function to trigger onChange listeners
 */
function triggerOnChange(commentStore: CommentStore): void {
  const listeners = commentStore._changeListeners
  for (const listener of listeners) {
    listener()
  }
}

/**
 * Store for managing comments and threads
 */
export class CommentStore implements CommentStoreInterface {
  _editor: LexicalEditor
  _comments: Comments
  _changeListeners: Set<() => void>

  constructor(editor: LexicalEditor) {
    this._comments = []
    this._editor = editor
    this._changeListeners = new Set()
  }

  /**
   * Get all comments and threads
   */
  getComments(): Comments {
    return this._comments
  }

  /**
   * Add a comment or thread to the store
   */
  addComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
    offset?: number,
  ): void {
    const nextComments = Array.from(this._comments)

    if (thread !== undefined && commentOrThread.type === 'comment') {
      // Adding a comment to an existing thread
      for (let i = 0; i < nextComments.length; i++) {
        const comment = nextComments[i]
        if (comment.type === 'thread' && comment.id === thread.id) {
          const newThread = cloneThread(comment)
          
          // Check if this comment already exists in the thread
          const isDuplicate = isCommentDuplicateInThread(newThread, commentOrThread as Comment)
          
          if (!isDuplicate) {
            nextComments.splice(i, 1, newThread)
            const insertOffset =
              offset !== undefined ? offset : newThread.comments.length
            newThread.comments.splice(insertOffset, 0, commentOrThread)
          }
          break
        }
      }
    } else {
      // Adding a new thread or standalone comment
      if (commentOrThread.type === 'thread') {
        // Check if this thread already exists
        const isDuplicate = isThreadDuplicate(nextComments, commentOrThread as Thread)
        
        if (!isDuplicate) {
          const insertOffset = offset !== undefined ? offset : nextComments.length
          nextComments.splice(insertOffset, 0, commentOrThread)
        }
      } else {
        // Adding a standalone comment (not in a thread)
        const insertOffset = offset !== undefined ? offset : nextComments.length
        nextComments.splice(insertOffset, 0, commentOrThread)
      }
    }
    this._comments = nextComments
    triggerOnChange(this)
  }

  /**
   * Delete a comment or thread from the store
   */
  deleteCommentOrThread(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): CommentDeletionResult | null {
    const nextComments = Array.from(this._comments)
    let commentIndex: number | null = null

    if (thread !== undefined) {
      for (let i = 0; i < nextComments.length; i++) {
        const nextComment = nextComments[i]
        if (nextComment.type === 'thread' && nextComment.id === thread.id) {
          const newThread = cloneThread(nextComment)
          nextComments.splice(i, 1, newThread)
          const threadComments = newThread.comments
          commentIndex = threadComments.indexOf(commentOrThread as Comment)
          threadComments.splice(commentIndex, 1)
          break
        }
      }
    } else {
      commentIndex = nextComments.indexOf(commentOrThread)
      nextComments.splice(commentIndex, 1)
    }
    this._comments = nextComments
    triggerOnChange(this)

    if (commentOrThread.type === 'comment') {
      return {
        index: commentIndex as number,
        markedComment: markDeleted(commentOrThread as Comment),
      }
    }

    return null
  }

  /**
   * Register a callback to be called when the store changes
   */
  registerOnChange(onChange: () => void): () => void {
    const changeListeners = this._changeListeners
    changeListeners.add(onChange)
    return () => {
      changeListeners.delete(onChange)
    }
  }

  /**
   * Load comments for a document from the Payload API
   */
  async loadComments(documentId: string): Promise<void> {
    return withErrorHandling(
      async () => {
        // Clear existing comments
        this._comments = []
        
        // Load comments from the API service
        const comments = await commentService.loadComments(documentId)
        
        // Update the store with the loaded comments
        this._comments = comments
        
        // Notify listeners
        triggerOnChange(this)
      },
      'Error loading comments',
      undefined
    )
  }

  /**
   * Save a comment or thread to the Payload API
   */
  async saveComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        // Add to local store first for immediate feedback
        this.addComment(commentOrThread, thread)
        
        // Get the document ID from the URL
        const documentId = getDocumentIdFromUrl()
        
        // Save to the API service
        await commentService.saveComment(commentOrThread, thread, documentId)
      },
      'Error saving comment',
      undefined
    )
  }
}

// Export the hook from its dedicated file
export { useCommentStore } from './hooks/useCommentStore.js'
