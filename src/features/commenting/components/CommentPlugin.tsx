'use client'

import type { NodeKey } from '@payloadcms/richtext-lexical/lexical'

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'

import { CommentStore, useCommentStore } from '../store.js'
import { AddCommentBox } from './AddCommentBox.js'
import { CommentInputBox } from './CommentInputBox.js'
import { CommentsPanel } from './CommentPanel.js'
import { useCommentMarks } from '../hooks/editor/useCommentMarks.js'
import { useCommentCommands } from '../hooks/editor/useCommentCommands.js'
import { useDocumentOperations } from '../hooks/useDocumentOperations.js'
import { useCommentOperations } from '../hooks/useCommentOperations.js'

import './CommentPlugin.css'

type CommentPluginProps = {
  documentId?: string
  currentUser: string
}

export const CommentPlugin: React.FC<CommentPluginProps> = ({
  documentId = 'default',
  currentUser,
}) => {
  // Editor context
  const [editor] = useLexicalComposerContext()
  
  // Comment store
  const commentStore = useMemo(() => new CommentStore(editor), [editor])
  const comments = useCommentStore(commentStore)
  
  // UI state
  const [activeAnchorKey, setActiveAnchorKey] = useState<NodeKey | null>(null)
  const [activeIDs, setActiveIDs] = useState<Array<string>>([])
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [showComments, setShowComments] = useState(false)
  
  // Custom hooks
  const markNodeMap = useCommentMarks(editor, setActiveIDs, setActiveAnchorKey)
  const { isDocumentSaved, saveDocument } = useDocumentOperations(editor, documentId)
  const { deleteCommentOrThread, submitAddComment } = useCommentOperations(
    commentStore, 
    editor, 
    markNodeMap, 
    saveDocument
  )
  const { cancelAddComment, onAddComment, toggleComments } = useCommentCommands(
    editor,
    setShowCommentInput,
    setShowComments,
    showComments,
    showCommentInput,
    setActiveAnchorKey
  )

  // Highlight active comments
  useEffect(() => {
    const changedElems: Array<HTMLElement> = []
    for (let i = 0; i < activeIDs.length; i++) {
      const id = activeIDs[i]
      const keys = markNodeMap.get(id)
      if (keys !== undefined) {
        for (const key of keys) {
          const elem = editor.getElementByKey(key)
          if (elem !== null) {
            elem.classList.add('selected')
            changedElems.push(elem)
            setShowComments(true)
          }
        }
      }
    }
    return () => {
      for (let i = 0; i < changedElems.length; i++) {
        const changedElem = changedElems[i]
        changedElem.classList.remove('selected')
      }
    }
  }, [activeIDs, editor, markNodeMap])

  // Load comments when documentId changes
  useEffect(() => {
    if (documentId) {
      commentStore.loadComments(documentId)
    }
  }, [commentStore, documentId])

  return (
    <>
      {isDocumentSaved && showCommentInput &&
        createPortal(
          <CommentInputBox
            editor={editor}
            cancelAddComment={cancelAddComment}
            submitAddComment={submitAddComment}
            author={currentUser}
            setActiveAnchorKey={setActiveAnchorKey}
            setShowCommentInput={setShowCommentInput}
          />,
          document.body,
        )}
      {isDocumentSaved && activeAnchorKey !== null &&
        !showCommentInput &&
        createPortal(
          <AddCommentBox
            anchorKey={activeAnchorKey}
            editor={editor}
            onAddComment={onAddComment}
          />,
          document.body,
        )}
      {isDocumentSaved && createPortal(
        <button
          className={`CommentPlugin_ShowCommentsButton ${
            showComments ? 'active' : ''
          }`}
          onClick={toggleComments}
          title={showComments ? 'Hide Comments' : 'Show Comments'}
          aria-label={showComments ? 'Hide Comments' : 'Show Comments'}
        >
          <i className="comments" />
        </button>,
        document.body,
      )}
      {isDocumentSaved && showComments &&
        createPortal(
          <CommentsPanel
            comments={comments}
            submitAddComment={submitAddComment}
            deleteCommentOrThread={deleteCommentOrThread}
            activeIDs={activeIDs}
            markNodeMap={markNodeMap}
            currentUser={currentUser}
          />,
          document.body,
        )}
    </>
  )
}
