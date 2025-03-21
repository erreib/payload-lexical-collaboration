'use client'

import React, { useState } from 'react'

type CommentComposerProps = {
  submitAddComment: (content: string) => void
  placeholder?: string
}

/**
 * Component for composing and submitting new comments
 */
export const CommentComposer: React.FC<CommentComposerProps> = ({
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
