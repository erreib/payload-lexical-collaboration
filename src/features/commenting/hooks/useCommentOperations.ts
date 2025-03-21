'use client'

import { useCallback } from 'react'
import type { LexicalEditor, NodeKey } from '@payloadcms/richtext-lexical/lexical'
import type { Comment, Thread } from '../types.js'
import type { CommentStore } from '../store.js'
import { commentOperations } from '../services/commentOperations.js'

/**
 * Hook for handling comment operations
 * @param commentStore The comment store instance
 * @param editor The Lexical editor instance
 * @param markNodeMap Map of mark node keys to IDs
 * @param saveDocument Function to save the document
 * @returns Object with functions to handle comment operations
 */
export function useCommentOperations(
  commentStore: CommentStore,
  editor: LexicalEditor,
  markNodeMap: Map<string, Set<NodeKey>>,
  saveDocument: () => Promise<void | boolean>
) {
  // Delete a comment or thread
  const deleteCommentOrThread = useCallback(
    (comment: Comment | Thread, thread?: Thread) => {
      return commentOperations.deleteCommentOrThread(
        commentStore,
        editor,
        markNodeMap,
        comment,
        thread,
        saveDocument
      );
    },
    [commentStore, editor, markNodeMap, saveDocument]
  );

  // Submit a new comment
  const submitAddComment = useCallback(
    (
      commentOrThread: Comment | Thread,
      isInlineComment: boolean,
      thread?: Thread,
      selection?: any,
    ) => {
      return commentOperations.submitAddComment(
        commentStore,
        editor,
        commentOrThread,
        isInlineComment,
        thread,
        selection,
        saveDocument
      );
    },
    [commentStore, editor, saveDocument]
  );

  return {
    deleteCommentOrThread,
    submitAddComment,
  }
}
