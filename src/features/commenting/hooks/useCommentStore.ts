'use client'

import { useState, useEffect } from 'react'
import type { Comments } from '../types/core.js'
import type { CommentStore } from '../store.js'

/**
 * React hook to use the comment store
 * @param commentStore The comment store instance
 * @returns The current comments
 */
export function useCommentStore(commentStore: CommentStore): Comments {
  const [comments, setComments] = useState<Comments>(
    commentStore.getComments(),
  )

  useEffect(() => {
    return commentStore.registerOnChange(() => {
      setComments(commentStore.getComments())
    })
  }, [commentStore])

  return comments
}
