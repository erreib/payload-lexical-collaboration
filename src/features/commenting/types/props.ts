/**
 * Component prop types for the commenting feature
 */

import type { LexicalEditor, NodeKey, RangeSelection } from '@payloadcms/richtext-lexical/lexical'
import type { Comment, Comments, MarkNodeMapType, Thread } from './core.js'

/**
 * Props for the CommentPlugin component
 */
export type CommentPluginProps = {
  /**
   * ID of the document to load comments for
   * @default 'default'
   */
  documentId?: string
  
  /**
   * Current user's identifier (typically email)
   */
  currentUser: string
}

/**
 * Props for the CommentInputBox component
 */
export type CommentInputBoxProps = {
  /**
   * The Lexical editor instance
   */
  editor: LexicalEditor
  
  /**
   * Function to cancel adding a comment
   */
  cancelAddComment: () => void
  
  /**
   * Function to submit a new comment
   */
  submitAddComment: (
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
    selection?: RangeSelection | null,
  ) => void
  
  /**
   * Author of the comment (typically user email)
   */
  author: string
  
  /**
   * Function to set the active anchor key
   */
  setActiveAnchorKey: (key: NodeKey | null) => void
  
  /**
   * Function to show/hide the comment input
   */
  setShowCommentInput: (show: boolean) => void
}

/**
 * Props for the CommentsPanel component
 */
export type CommentsPanelProps = {
  /**
   * IDs of active comments
   */
  activeIDs: Array<string>
  
  /**
   * List of comments and threads
   */
  comments: Comments
  
  /**
   * Function to delete a comment or thread
   */
  deleteCommentOrThread: (
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ) => void
  
  /**
   * Map of mark node keys to IDs
   */
  markNodeMap: MarkNodeMapType
  
  /**
   * Function to submit a new comment
   */
  submitAddComment: (
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
  ) => void
  
  /**
   * Current user's identifier (typically email)
   */
  currentUser: string
}

/**
 * Props for the AddCommentBox component
 */
export type AddCommentBoxProps = {
  /**
   * Key of the anchor node
   */
  anchorKey: NodeKey
  
  /**
   * The Lexical editor instance
   */
  editor: LexicalEditor
  
  /**
   * Function to add a comment
   */
  onAddComment: () => void
}

/**
 * Props for the CommentItem component
 */
export type CommentItemProps = {
  /**
   * The comment to display
   */
  comment: Comment
  
  /**
   * Function to delete a comment
   */
  deleteComment: (comment: Comment) => void
  
  /**
   * Whether the comment is by the current user
   */
  isAuthor: boolean
}

/**
 * Props for the ThreadItem component
 */
export type ThreadItemProps = {
  /**
   * The thread to display
   */
  thread: Thread
  
  /**
   * Function to delete a comment or thread
   */
  deleteCommentOrThread: (
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ) => void
  
  /**
   * Function to submit a new comment
   */
  submitAddComment: (
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
  ) => void
  
  /**
   * Current user's identifier (typically email)
   */
  currentUser: string
  
  /**
   * Whether the thread is active
   */
  isActive: boolean
}

/**
 * Props for the TimeAgo component
 */
export type TimeAgoProps = {
  /**
   * Timestamp to display relative time for
   */
  timestamp: number
}

/**
 * Props for the CommentComposer component
 */
export type CommentComposerProps = {
  /**
   * Function to submit a new comment
   */
  submitAddComment: (content: string) => void
  
  /**
   * Function to cancel adding a comment
   */
  cancelAddComment: () => void
  
  /**
   * Initial content for the composer
   */
  initialContent?: string
}

/**
 * Feature prop types
 */
export type CommentClientFeatureProps = {
  /**
   * Whether to enable the commenting feature
   * @default true
   */
  enabled?: boolean
}
