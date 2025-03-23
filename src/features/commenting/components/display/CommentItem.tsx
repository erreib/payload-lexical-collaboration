'use client'

import React from 'react'
import type { Comment } from '../../types/core.js'
import { TimeAgo } from './TimeAgo.js'

type CommentItemProps = {
  comment: Comment
  onDelete?: () => void
}

/**
 * Component for rendering a single comment
 */
export const CommentItem: React.FC<CommentItemProps> = ({ comment, onDelete }) => {
  return (
    <li className="CommentPlugin_CommentsPanel_List_Comment">
      <div className="CommentPlugin_CommentsPanel_List_Details">
        <span className="CommentPlugin_CommentsPanel_List_Comment_Author">
          {comment.author}
        </span>
        <span className="CommentPlugin_CommentsPanel_List_Comment_Time">
          · <TimeAgo timestamp={comment.timeStamp} />
        </span>
      </div>
      <p
        className={
          comment.deleted ? 'CommentPlugin_CommentsPanel_DeletedComment' : ''
        }
      >
        {comment.content}
      </p>
      {!comment.deleted && onDelete && (
        <button
          onClick={onDelete}
          className="CommentPlugin_CommentsPanel_List_DeleteButton"
          aria-label="Delete comment"
        >
          <i className="delete" />
        </button>
      )}
    </li>
  )
}
