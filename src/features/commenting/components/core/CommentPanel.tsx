'use client'

import type { Comment, CommentsPanelProps, Thread } from '../../types.js'

import React, { useRef } from 'react'
import { createComment } from '../../utils/factory.js'
import { confirmDeleteComment, confirmDeleteThread } from '../../utils/dialog.js'
import { CommentItem } from '../display/CommentItem.js'
import { ThreadItem } from '../display/ThreadItem.js'

/**
 * Panel for displaying and managing comments and threads
 */
export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  activeIDs,
  comments,
  deleteCommentOrThread,
  markNodeMap,
  submitAddComment,
  currentUser,
}) => {
  const listRef = useRef<HTMLUListElement>(null)
  const isEmpty = comments.length === 0

  const handleDeleteComment = (commentId: string, thread?: Thread) => {
    if (!confirmDeleteComment()) return
    
    // Find the comment in the thread or standalone
    const comment = thread 
      ? thread.comments.find(c => c.id === commentId)
      : comments.find(c => c.id === commentId && c.type === 'comment') as Comment | undefined
    
    if (comment) {
      deleteCommentOrThread(comment, thread)
    }
  }

  const handleDeleteThread = (thread: Thread) => {
    if (confirmDeleteThread()) {
      deleteCommentOrThread(thread)
    }
  }

  const handleSubmitReply = (content: string, thread: Thread) => {
    if (content.trim()) {
      submitAddComment(createComment(content, currentUser), false, thread)
    }
  }

  return (
    <div className="CommentPlugin_CommentsPanel">
      <h2 className="CommentPlugin_CommentsPanel_Heading">Comments</h2>
      {isEmpty ? (
        <div className="CommentPlugin_CommentsPanel_Empty">No Comments</div>
      ) : (
        <ul className="CommentPlugin_CommentsPanel_List" ref={listRef}>
          {comments.map((commentOrThread) => {
            const id = commentOrThread.id
            
            if (commentOrThread.type === 'thread') {
              const thread = commentOrThread
              return (
                <ThreadItem
                  key={id}
                  thread={thread}
                  isActive={activeIDs.includes(id)}
                  isInteractive={markNodeMap.has(id)}
                  onDeleteThread={handleDeleteThread}
                  onDeleteComment={(commentId) => handleDeleteComment(commentId, thread)}
                  onSubmitReply={(content) => handleSubmitReply(content, thread)}
                />
              )
            }
            
            // Handle standalone comments (not in a thread)
            return (
              <CommentItem
                key={id}
                comment={commentOrThread}
                onDelete={
                  !commentOrThread.deleted
                    ? () => handleDeleteComment(commentOrThread.id)
                    : undefined
                }
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
