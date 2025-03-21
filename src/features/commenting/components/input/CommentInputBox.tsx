'use client'

import type { LexicalEditor, NodeKey, RangeSelection } from '@payloadcms/richtext-lexical/lexical'
import type { Comment, Thread } from '../../types.js'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createDOMRange, createRectsFromDOMRange } from '@payloadcms/richtext-lexical/lexical/selection'
import { $getSelection, $isRangeSelection } from '@payloadcms/richtext-lexical/lexical'
import { createComment, createThread } from '../../utils/factory.js'
import { useLayoutEffect } from 'react'

type CommentInputBoxProps = {
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

export const CommentInputBox: React.FC<CommentInputBoxProps> = ({
  editor,
  cancelAddComment,
  submitAddComment,
  author,
  setActiveAnchorKey,
  setShowCommentInput,
}) => {
  const [content, setContent] = useState('')
  const [canSubmit, setCanSubmit] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const selectionState = useMemo(
    () => ({
      container: document.createElement('div'),
      elements: [],
    }),
    [],
  )
  const selectionRef = useRef<RangeSelection | null>(null)

  const updateLocation = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()

      if ($isRangeSelection(selection)) {
        selectionRef.current = selection.clone()
        const anchor = selection.anchor
        const focus = selection.focus
        const range = createDOMRange(
          editor,
          anchor.getNode(),
          anchor.offset,
          focus.getNode(),
          focus.offset,
        )
        const boxElem = boxRef.current
        if (range !== null && boxElem !== null) {
          const { left, bottom, width } = range.getBoundingClientRect()
          const selectionRects = createRectsFromDOMRange(editor, range)
          let correctedLeft =
            selectionRects.length === 1 ? left + width / 2 - 125 : left - 125
          if (correctedLeft < 10) {
            correctedLeft = 10
          }
          boxElem.style.left = `${correctedLeft}px`
          boxElem.style.top = `${
            bottom +
            20 +
            (window.pageYOffset || document.documentElement.scrollTop)
          }px`
          const selectionRectsLength = selectionRects.length
          const { container } = selectionState
          const elements: Array<HTMLSpanElement> = selectionState.elements
          const elementsLength = elements.length

          for (let i = 0; i < selectionRectsLength; i++) {
            const selectionRect = selectionRects[i]
            let elem: HTMLSpanElement = elements[i]
            if (elem === undefined) {
              elem = document.createElement('span')
              elements[i] = elem
              container.appendChild(elem)
            }
            const color = '255, 212, 0'
            const style = `position:absolute;top:${
              selectionRect.top +
              (window.pageYOffset || document.documentElement.scrollTop)
            }px;left:${selectionRect.left}px;height:${
              selectionRect.height
            }px;width:${
              selectionRect.width
            }px;background-color:rgba(${color}, 0.3);pointer-events:none;z-index:5;`
            elem.style.cssText = style
          }
          for (let i = elementsLength - 1; i >= selectionRectsLength; i--) {
            const elem = elements[i]
            container.removeChild(elem)
            elements.pop()
          }
        }
      }
    })
  }, [editor, selectionState])

  useLayoutEffect(() => {
    updateLocation()
    const container = selectionState.container
    const body = document.body
    if (body !== null) {
      body.appendChild(container)
      return () => {
        body.removeChild(container)
      }
    }
  }, [selectionState.container, updateLocation])

  useEffect(() => {
    window.addEventListener('resize', updateLocation)

    return () => {
      window.removeEventListener('resize', updateLocation)
    }
  }, [updateLocation])

  const submitComment = () => {
    if (canSubmit) {
      let quote = editor.getEditorState().read(() => {
        const selection = selectionRef.current
        return selection ? selection.getTextContent() : ''
      })
      if (quote.length > 100) {
        quote = quote.slice(0, 99) + '…'
      }
      submitAddComment(
        createThread(quote, [createComment(content, author)]),
        true,
        undefined,
        selectionRef.current,
      )
      selectionRef.current = null
      // Reset the active anchor key to hide the AddCommentBox tooltip
      setActiveAnchorKey(null)
      // Close the comment input form
      setShowCommentInput(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    setCanSubmit(newContent.trim().length > 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelAddComment()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSubmit) {
      e.preventDefault()
      submitComment()
    }
  }

  return createPortal(
    <div className="CommentPlugin_CommentInputBox" ref={boxRef}>
      <div className="CommentPlugin_CommentInputBox_EditorContainer">
        <textarea
          className="CommentPlugin_CommentInputBox_Editor"
          placeholder="Type a comment..."
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
      <div className="CommentPlugin_CommentInputBox_Buttons">
        <button
          onClick={cancelAddComment}
          className="CommentPlugin_CommentInputBox_Button"
        >
          Cancel
        </button>
        <button
          onClick={submitComment}
          disabled={!canSubmit}
          className="CommentPlugin_CommentInputBox_Button primary"
        >
          Comment
        </button>
      </div>
    </div>,
    document.body,
  )
}
