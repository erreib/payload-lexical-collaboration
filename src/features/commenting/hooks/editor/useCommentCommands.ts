'use client'

import { useCallback, useEffect } from 'react'
import type { LexicalEditor, NodeKey } from '@payloadcms/richtext-lexical/lexical'
import type { CommentCommandsResult } from '../../types.js'
import {
  $getSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
} from '@payloadcms/richtext-lexical/lexical'
import { INSERT_COMMENT_COMMAND, TOGGLE_COMMENTS_COMMAND } from '../../command.js'

/**
 * Hook for handling comment-related commands
 * @param editor The Lexical editor instance
 * @param setShowCommentInput Function to set whether to show the comment input
 * @param setShowComments Function to set whether to show comments
 * @param showComments Current state of showing comments
 * @param showCommentInput Current state of showing comment input
 * @param setActiveAnchorKey Function to set the active anchor key
 * @returns Object with functions to handle comment commands
 */
export function useCommentCommands(
  editor: LexicalEditor,
  setShowCommentInput: (show: boolean) => void,
  setShowComments: (show: boolean) => void,
  showComments: boolean,
  showCommentInput: boolean,
  setActiveAnchorKey: (key: NodeKey | null) => void
): CommentCommandsResult {
  // Cancel adding a comment
  const cancelAddComment = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      // Restore selection
      if (selection !== null) {
        selection.dirty = true
      }
    })
    setShowCommentInput(false)
    // Reset the active anchor key to hide the AddCommentBox tooltip
    setActiveAnchorKey(null)
  }, [editor, setShowCommentInput, setActiveAnchorKey])

  // Add a comment
  const onAddComment = useCallback(() => {
    editor.dispatchCommand(INSERT_COMMENT_COMMAND, undefined)
  }, [editor])

  // Toggle showing comments
  const toggleComments = useCallback(() => {
    editor.dispatchCommand(TOGGLE_COMMENTS_COMMAND, undefined)
  }, [editor])

  // Register commands
  useEffect(() => {
    return editor.registerCommand(
      INSERT_COMMENT_COMMAND,
      () => {
        setShowCommentInput(true)
        return true
      },
      COMMAND_PRIORITY_CRITICAL,
    )
  }, [editor, setShowCommentInput])

  useEffect(() => {
    return editor.registerCommand(
      TOGGLE_COMMENTS_COMMAND,
      () => {
        setShowComments(!showComments)
        return true
      },
      COMMAND_PRIORITY_CRITICAL,
    )
  }, [editor, setShowComments, showComments])

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (showCommentInput) {
          cancelAddComment()
          return true
        }
        return false
      },
      COMMAND_PRIORITY_LOW,
    )
  }, [editor, showCommentInput, cancelAddComment])

  return {
    cancelAddComment,
    onAddComment,
    toggleComments,
  }
}
