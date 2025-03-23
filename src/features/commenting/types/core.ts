/**
 * Core comment types for the commenting feature
 */

// Core comment types
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

// Operation result types
export type CommentDeletionResult = {
  markedComment: Comment
  index: number
}

// Map types
export type MarkNodeMapType = Map<string, Set<string>>
