'use client'

import type { Comment, Comments, Thread } from '../store.js'
import type { NodeKey } from '@payloadcms/richtext-lexical/lexical'

import React, { useRef, useState, useMemo } from 'react'
import { createComment } from '../store.js'

type CommentsPanelProps = {
  activeIDs: Array<string>
  comments: Comments
  deleteCommentOrThread: (
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ) => void
  markNodeMap: Map<string, Set<NodeKey>>
  submitAddComment: (
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
  ) => void
  currentUser: string
}

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
  const [counter, setCounter] = useState(0)
  
  // Used for relative time formatting
  const rtf = useMemo(
    () =>
      new Intl.RelativeTimeFormat('en', {
        localeMatcher: 'best fit',
        numeric: 'auto',
        style: 'short',
      }),
    [],
  )

  // Used to keep the time stamp up to date
  React.useEffect(() => {
    const id = setTimeout(() => {
      setCounter(counter + 1)
    }, 10000)

    return () => {
      clearTimeout(id)
    }
  }, [counter])

  const handleDeleteComment = (comment: Comment, thread?: Thread) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteCommentOrThread(comment, thread)
    }
  }

  const handleDeleteThread = (thread: Thread) => {
    if (window.confirm('Are you sure you want to delete this thread?')) {
      deleteCommentOrThread(thread)
    }
  }

  const handleSubmitReply = (content: string, thread: Thread) => {
    if (content.trim()) {
      submitAddComment(createComment(content, currentUser), false, thread)
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.round(
      (timestamp - (performance.timeOrigin + performance.now())) / 1000,
    )
    const minutes = Math.round(seconds / 60)
    return seconds > -10 ? 'Just now' : rtf.format(minutes, 'minute')
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
                <li
                  key={id}
                  className={`CommentPlugin_CommentsPanel_List_Thread ${
                    markNodeMap.has(id) ? 'interactive' : ''
                  } ${activeIDs.indexOf(id) === -1 ? '' : 'active'}`}
                >
                  <div className="CommentPlugin_CommentsPanel_List_Thread_QuoteBox">
                    <blockquote className="CommentPlugin_CommentsPanel_List_Thread_Quote">
                      {'> '}
                      <span>{thread.quote}</span>
                    </blockquote>
                    <button
                      onClick={() => handleDeleteThread(thread)}
                      className="CommentPlugin_CommentsPanel_List_DeleteButton"
                      aria-label="Delete thread"
                    >
                      <i className="delete" />
                    </button>
                  </div>
                  <ul className="CommentPlugin_CommentsPanel_List_Thread_Comments">
                    {thread.comments.map((comment) => (
                      <li key={comment.id} className="CommentPlugin_CommentsPanel_List_Comment">
                        <div className="CommentPlugin_CommentsPanel_List_Details">
                          <span className="CommentPlugin_CommentsPanel_List_Comment_Author">
                            {comment.author}
                          </span>
                          <span className="CommentPlugin_CommentsPanel_List_Comment_Time">
                            · {formatTimeAgo(comment.timeStamp)}
                          </span>
                        </div>
                        <p
                          className={
                            comment.deleted ? 'CommentPlugin_CommentsPanel_DeletedComment' : ''
                          }
                        >
                          {comment.content}
                        </p>
                        {!comment.deleted && (
                          <button
                            onClick={() => handleDeleteComment(comment, thread)}
                            className="CommentPlugin_CommentsPanel_List_DeleteButton"
                            aria-label="Delete comment"
                          >
                            <i className="delete" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="CommentPlugin_CommentsPanel_List_Thread_Editor">
                    <CommentComposer
                      submitAddComment={(content) => handleSubmitReply(content, thread)}
                      placeholder="Reply to comment..."
                    />
                  </div>
                </li>
              )
            }
            // Handle standalone comments (not in a thread)
            const comment = commentOrThread
            return (
              <li key={id} className="CommentPlugin_CommentsPanel_List_Comment">
                <div className="CommentPlugin_CommentsPanel_List_Details">
                  <span className="CommentPlugin_CommentsPanel_List_Comment_Author">
                    {comment.author}
                  </span>
                  <span className="CommentPlugin_CommentsPanel_List_Comment_Time">
                    · {formatTimeAgo(comment.timeStamp)}
                  </span>
                </div>
                <p
                  className={
                    comment.deleted ? 'CommentPlugin_CommentsPanel_DeletedComment' : ''
                  }
                >
                  {comment.content}
                </p>
                {!comment.deleted && (
                  <button
                    onClick={() => handleDeleteComment(comment)}
                    className="CommentPlugin_CommentsPanel_List_DeleteButton"
                    aria-label="Delete comment"
                  >
                    <i className="delete" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

type CommentComposerProps = {
  submitAddComment: (content: string) => void
  placeholder?: string
}

const CommentComposer: React.FC<CommentComposerProps> = ({
  submitAddComment,
  placeholder = 'Type a comment...',
}) => {
  const [content, setContent] = useState('')
  const [canSubmit, setCanSubmit] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    setCanSubmit(newContent.trim().length > 0)
  }

  const handleSubmit = () => {
    if (canSubmit) {
      submitAddComment(content)
      setContent('')
      setCanSubmit(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSubmit) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="CommentPlugin_CommentsPanel_Composer">
      <textarea
        className="CommentPlugin_CommentsPanel_Editor"
        placeholder={placeholder}
        value={content}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="CommentPlugin_CommentsPanel_SendButton"
        aria-label="Send comment"
      >
        <i className="send" />
      </button>
    </div>
  )
}
