import type { LexicalEditor } from '@payloadcms/richtext-lexical/lexical'

export type Comment = {
  author: string
  content: string
  deleted: boolean
  id: string
  timeStamp: number
  type: 'comment'
}

export type Thread = {
  comments: Array<Comment>
  id: string
  quote: string
  type: 'thread'
}

export type Comments = Array<Thread | Comment>

function createUID(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substring(0, 5)
}

export function createComment(
  content: string,
  author: string,
  id?: string,
  timeStamp?: number,
  deleted?: boolean,
): Comment {
  return {
    author,
    content,
    deleted: deleted === undefined ? false : deleted,
    id: id === undefined ? createUID() : id,
    timeStamp:
      timeStamp === undefined
        ? performance.timeOrigin + performance.now()
        : timeStamp,
    type: 'comment',
  }
}

export function createThread(
  quote: string,
  comments: Array<Comment>,
  id?: string,
): Thread {
  return {
    comments,
    id: id === undefined ? createUID() : id,
    quote,
    type: 'thread',
  }
}

function cloneThread(thread: Thread): Thread {
  return {
    comments: Array.from(thread.comments),
    id: thread.id,
    quote: thread.quote,
    type: 'thread',
  }
}

function markDeleted(comment: Comment): Comment {
  return {
    author: comment.author,
    content: '[Deleted Comment]',
    deleted: true,
    id: comment.id,
    timeStamp: comment.timeStamp,
    type: 'comment',
  }
}

function triggerOnChange(commentStore: CommentStore): void {
  const listeners = commentStore._changeListeners
  for (const listener of listeners) {
    listener()
  }
}

export class CommentStore {
  _editor: LexicalEditor
  _comments: Comments
  _changeListeners: Set<() => void>
  _payload: any // Payload client

  constructor(editor: LexicalEditor) {
    this._comments = []
    this._editor = editor
    this._changeListeners = new Set()
  }

  getComments(): Comments {
    return this._comments
  }

  addComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
    offset?: number,
  ): void {
    const nextComments = Array.from(this._comments)

    if (thread !== undefined && commentOrThread.type === 'comment') {
      for (let i = 0; i < nextComments.length; i++) {
        const comment = nextComments[i]
        if (comment.type === 'thread' && comment.id === thread.id) {
          const newThread = cloneThread(comment)
          nextComments.splice(i, 1, newThread)
          const insertOffset =
            offset !== undefined ? offset : newThread.comments.length
          newThread.comments.splice(insertOffset, 0, commentOrThread)
          break
        }
      }
    } else {
      const insertOffset = offset !== undefined ? offset : nextComments.length
      nextComments.splice(insertOffset, 0, commentOrThread)
    }
    this._comments = nextComments
    triggerOnChange(this)
  }

  deleteCommentOrThread(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): {markedComment: Comment; index: number} | null {
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

  registerOnChange(onChange: () => void): () => void {
    const changeListeners = this._changeListeners
    changeListeners.add(onChange)
    return () => {
      changeListeners.delete(onChange)
    }
  }

  // Methods for Payload integration
  async loadComments(documentId: string): Promise<void> {
    // This would be implemented to fetch comments from Payload API
    // For now, we'll just use the in-memory comments
    triggerOnChange(this)
  }

  async saveComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): Promise<void> {
    // This would be implemented to save comments to Payload API
    // For now, we'll just use the in-memory comments
    this.addComment(commentOrThread, thread)
  }
}

// React hook to use the comment store
import { useState, useEffect } from 'react'

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
