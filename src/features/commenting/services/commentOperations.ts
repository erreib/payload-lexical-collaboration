'use client'

import type { LexicalEditor } from '@payloadcms/richtext-lexical/lexical'
import type { Comment, CommentDeletionResult, MarkNodeMapType, Thread } from '../types/core.js'
import type { CommentStore } from '../store.js'
import type { ICommentOperations } from '../types/services.js'
import type { CommentAPIEntity } from '../types/api.js'
import { API_ENDPOINTS } from '../types/api.js'
import { APIUtils } from '../utils/api.js'
import { withErrorHandling } from '../utils/errorHandling.js'
import {
  $isMarkNode,
  $unwrapMarkNode,
  $wrapSelectionInMarkNode,
  MarkNode,
} from '@payloadcms/richtext-lexical/lexical/mark'
import {
  $getNodeByKey,
  $isRangeSelection,
} from '@payloadcms/richtext-lexical/lexical'

/**
 * Service for handling comment operations
 */
export class CommentOperations implements ICommentOperations {
  /**
   * Delete a comment or thread
   * @param commentStore The comment store instance
   * @param editor The Lexical editor instance
   * @param markNodeMap Map of mark node keys to IDs
   * @param comment The comment or thread to delete
   * @param thread The parent thread (if deleting a comment within a thread)
   * @param saveDocumentCallback Optional callback to save the document after deletion
   * @returns The deletion info or null
   */
  async deleteCommentOrThread(
    commentStore: CommentStore,
    editor: LexicalEditor,
    markNodeMap: MarkNodeMapType,
    comment: Comment | Thread,
    thread?: Thread,
    saveDocumentCallback?: () => Promise<void | boolean>
  ): Promise<CommentDeletionResult | null> {
    return withErrorHandling(
      async () => {
        if (comment.type === 'comment') {
          const deletionInfo = commentStore.deleteCommentOrThread(
            comment,
            thread,
          )
          if (!deletionInfo) {
            return null
          }
          const { markedComment, index } = deletionInfo
          
          // Mark as deleted in the database using Payload's built-in REST API
          await APIUtils.patch(`${API_ENDPOINTS.COMMENTS}/${comment.id}`, {
            resolved: true, // Use resolved field to mark as deleted
          })
          
          commentStore.addComment(markedComment, thread, index)
          return deletionInfo
        } else {
          commentStore.deleteCommentOrThread(comment)
          
          // Mark thread as resolved in the database using Payload's built-in REST API
          // Update all comments with this threadId
          const threadId = comment.id
          const params = { 'where[threadId][equals]': threadId }
          const data = await APIUtils.getPaginated<CommentAPIEntity>(API_ENDPOINTS.COMMENTS, params)
          
          // For each comment in the thread, mark it as resolved
          if (data.docs && Array.isArray(data.docs)) {
            const updatePromises = data.docs.map(async (threadComment: CommentAPIEntity) => {
              return APIUtils.patch(`${API_ENDPOINTS.COMMENTS}/${threadComment.id}`, {
                resolved: true,
              })
            })
            
            // Wait for all updates to complete
            await Promise.all(updatePromises)
          }
          
          // Remove ids from associated marks
          const id = thread !== undefined ? thread.id : comment.id
          const markNodeKeys = markNodeMap.get(id)
          
          if (markNodeKeys !== undefined) {
            // Do async to avoid causing a React infinite loop
            setTimeout(async () => {
              editor.update(() => {
                for (const key of markNodeKeys) {
                  const node: null | MarkNode = $getNodeByKey(key)
                  if ($isMarkNode(node)) {
                    node.deleteID(id)
                    if (node.getIDs().length === 0) {
                      $unwrapMarkNode(node)
                    }
                  }
                }
              })
              
              // Save the document after removing comment marks
              if (saveDocumentCallback) {
                await saveDocumentCallback()
              }
            })
          }
          
          return null
        }
      },
      'Error deleting comment or thread',
      null
    )
  }

  /**
   * Submit a new comment or thread
   * @param commentStore The comment store instance
   * @param editor The Lexical editor instance
   * @param commentOrThread The comment or thread to add
   * @param isInlineComment Whether this is an inline comment
   * @param thread The parent thread (if adding a comment to a thread)
   * @param selection The current selection (for inline comments)
   * @param saveDocumentCallback Optional callback to save the document after adding the comment
   */
  async submitAddComment(
    commentStore: CommentStore,
    editor: LexicalEditor,
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
    selection?: any,
    saveDocumentCallback?: () => Promise<void | boolean>
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        // Use saveComment instead of addComment to persist to database
        await commentStore.saveComment(commentOrThread, thread)
        
        if (isInlineComment && selection) {
          editor.update(() => {
            if ($isRangeSelection(selection)) {
              const isBackward = selection.isBackward()
              const id = commentOrThread.id

              // Wrap content in a MarkNode
              $wrapSelectionInMarkNode(selection, isBackward, id)
            }
          })
          
          // Save the document after adding a comment
          if (saveDocumentCallback) {
            await saveDocumentCallback()
          }
        }
      },
      'Error submitting comment',
      undefined
    )
  }
}

// Export a singleton instance
export const commentOperations = new CommentOperations()
