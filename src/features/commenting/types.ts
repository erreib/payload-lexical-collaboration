import type { LexicalEditor, NodeKey, RangeSelection } from '@payloadcms/richtext-lexical/lexical'

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

// Store interface
export interface CommentStoreInterface {
  getComments(): Comments
  addComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
    offset?: number,
  ): void
  deleteCommentOrThread(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): CommentDeletionResult | null
  registerOnChange(onChange: () => void): () => void
  loadComments(documentId: string): Promise<void>
  saveComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): Promise<void>
}

// Operation result types
export type CommentDeletionResult = {
  markedComment: Comment
  index: number
}

// Map types
export type MarkNodeMapType = Map<string, Set<NodeKey>>

// Component prop types
export type CommentPluginProps = {
  documentId?: string
  currentUser: string
}

export type CommentInputBoxProps = {
  editor: LexicalEditor
  cancelAddComment: () => void
  submitAddComment: (
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
    selection?: RangeSelection | null,
  ) => void
  author: string
  setActiveAnchorKey: (key: NodeKey | null) => void
  setShowCommentInput: (show: boolean) => void
}

export type CommentsPanelProps = {
  activeIDs: Array<string>
  comments: Comments
  deleteCommentOrThread: (
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ) => void
  markNodeMap: MarkNodeMapType
  submitAddComment: (
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
  ) => void
  currentUser: string
}

// Feature prop types
export type CommentClientFeatureProps = {
  /**
   * Whether to enable the commenting feature
   * @default true
   */
  enabled?: boolean
}

// Hook return types
export type CommentOperationsResult = {
  deleteCommentOrThread: (comment: Comment | Thread, thread?: Thread) => Promise<CommentDeletionResult | null>
  submitAddComment: (
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
    selection?: any,
  ) => Promise<void>
}

export type DocumentOperationsResult = {
  isDocumentSaved: boolean
  setIsDocumentSaved: (saved: boolean) => void
  checkIfDocumentExists: () => Promise<boolean>
  saveDocument: () => Promise<boolean>
}

export type CommentCommandsResult = {
  cancelAddComment: () => void
  onAddComment: () => void
  toggleComments: () => void
}
