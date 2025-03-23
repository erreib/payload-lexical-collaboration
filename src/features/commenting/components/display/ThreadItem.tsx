'use client'

import React from 'react'
import type { Thread } from '../../types/core.js'
import { CommentItem } from './CommentItem.js'
import { CommentComposer } from '../input/CommentComposer.js'

type ThreadItemProps = {
  thread: Thread
  isActive: boolean
  isInteractive: boolean
  onDeleteThread: (thread: Thread) => void
  onDeleteComment: (commentId: string, thread: Thread) => void
  onSubmitReply: (content: string, thread: Thread) => void
}

/**
 * Component for rendering a thread with its comments and reply composer
 */
export const ThreadItem: React.FC<ThreadItemProps> = ({
  thread,
  isActive,
  isInteractive,
  onDeleteThread,
  onDeleteComment,
  onSubmitReply,
}) => {
  return (
    <li
      className={`CommentPlugin_CommentsPanel_List_Thread ${
        isInteractive ? 'interactive' : ''
      } ${isActive ? 'active' : ''}`}
    >
      <div className="CommentPlugin_CommentsPanel_List_Thread_QuoteBox">
        <blockquote className="CommentPlugin_CommentsPanel_List_Thread_Quote">
          {'> '}
          <span>{thread.quote}</span>
        </blockquote>
        <button
          onClick={() => onDeleteThread(thread)}
          className="CommentPlugin_CommentsPanel_List_DeleteButton"
          aria-label="Delete thread"
        >
          <i className="delete" />
        </button>
      </div>
      <ul className="CommentPlugin_CommentsPanel_List_Thread_Comments">
        {thread.comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onDelete={
              !comment.deleted
                ? () => onDeleteComment(comment.id, thread)
                : undefined
            }
          />
        ))}
      </ul>
      <div className="CommentPlugin_CommentsPanel_List_Thread_Editor">
        <CommentComposer
          submitAddComment={(content) => onSubmitReply(content, thread)}
          placeholder="Reply to comment..."
        />
      </div>
    </li>
  )
}
