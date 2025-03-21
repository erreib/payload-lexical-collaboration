'use client'

import type { LexicalEditor, NodeKey } from '@payloadcms/richtext-lexical/lexical'

import React, { useCallback, useEffect, useRef } from 'react'
import { useLayoutEffect } from 'react'

type AddCommentBoxProps = {
  anchorKey: NodeKey
  editor: LexicalEditor
  onAddComment: () => void
}

export const AddCommentBox: React.FC<AddCommentBoxProps> = ({
  anchorKey,
  editor,
  onAddComment,
}) => {
  const boxRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    const boxElem = boxRef.current
    const rootElement = editor.getRootElement()
    const anchorElement = editor.getElementByKey(anchorKey)

    if (boxElem !== null && rootElement !== null && anchorElement !== null) {
      const { right } = rootElement.getBoundingClientRect()
      const { top } = anchorElement.getBoundingClientRect()
      boxElem.style.left = `${right - 20}px`
      boxElem.style.top = `${top - 30}px`
    }
  }, [anchorKey, editor])

  useEffect(() => {
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
    }
  }, [editor, updatePosition])

  useLayoutEffect(() => {
    updatePosition()
  }, [anchorKey, editor, updatePosition])

  return (
    <div className="CommentPlugin_AddCommentBox" ref={boxRef}>
      <button
        className="CommentPlugin_AddCommentBox_button"
        onClick={onAddComment}
        aria-label="Add comment"
      >
        <i className="icon add-comment" />
      </button>
    </div>
  )
}
