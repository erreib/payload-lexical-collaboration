'use client'

import type { LexicalEditor, NodeKey } from '@payloadcms/richtext-lexical/lexical'
import type { Comment, Comments, Thread } from '../store.js'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { mergeRegister, registerNestedElementResolver } from '@payloadcms/richtext-lexical/lexical/utils'
import {
  $createMarkNode,
  $getMarkIDs,
  $isMarkNode,
  $unwrapMarkNode,
  $wrapSelectionInMarkNode,
  MarkNode,
} from '@payloadcms/richtext-lexical/lexical/mark'
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
} from '@payloadcms/richtext-lexical/lexical'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'

import { CommentStore, useCommentStore } from '../store.js'
import { INSERT_COMMENT_COMMAND, TOGGLE_COMMENTS_COMMAND } from '../command.js'
import { AddCommentBox } from './AddCommentBox.js'
import { CommentInputBox } from './CommentInputBox.js'
import { CommentsPanel } from './CommentPanel.js'

import './CommentPlugin.css'

type CommentPluginProps = {
  documentId?: string
  currentUser: string
}

export const CommentPlugin: React.FC<CommentPluginProps> = ({
  documentId = 'default',
  currentUser,
}) => {
  const [editor] = useLexicalComposerContext()
  const commentStore = useMemo(() => new CommentStore(editor), [editor])
  const comments = useCommentStore(commentStore)
  const markNodeMap = useMemo<Map<string, Set<NodeKey>>>(() => {
    return new Map()
  }, [])
  const [activeAnchorKey, setActiveAnchorKey] = useState<NodeKey | null>(null)
  const [activeIDs, setActiveIDs] = useState<Array<string>>([])
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [showComments, setShowComments] = useState(false)

  const cancelAddComment = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      // Restore selection
      if (selection !== null) {
        selection.dirty = true
      }
    })
    setShowCommentInput(false)
  }, [editor])

  const deleteCommentOrThread = useCallback(
    (comment: Comment | Thread, thread?: Thread) => {
      if (comment.type === 'comment') {
        const deletionInfo = commentStore.deleteCommentOrThread(
          comment,
          thread,
        )
        if (!deletionInfo) {
          return
        }
        const { markedComment, index } = deletionInfo
        commentStore.addComment(markedComment, thread, index)
      } else {
        commentStore.deleteCommentOrThread(comment)
        // Remove ids from associated marks
        const id = thread !== undefined ? thread.id : comment.id
        const markNodeKeys = markNodeMap.get(id)
        if (markNodeKeys !== undefined) {
          // Do async to avoid causing a React infinite loop
          setTimeout(() => {
            editor.update(() => {
              for (const key of markNodeKeys) {
                const node: null | MarkNode = $getNodeByKey(key)
                if ($isMarkNode(node)) {
                  node.deleteID(id)
                  if (node.getIDs().length === 0) {
                    $unwrapMarkNode(node)
                  }
                }
              }
            })
          })
        }
      }
    },
    [commentStore, editor, markNodeMap],
  )

  const submitAddComment = useCallback(
    (
      commentOrThread: Comment | Thread,
      isInlineComment: boolean,
      thread?: Thread,
      selection?: any,
    ) => {
      commentStore.addComment(commentOrThread, thread)
      if (isInlineComment) {
        editor.update(() => {
          if ($isRangeSelection(selection)) {
            const isBackward = selection.isBackward()
            const id = commentOrThread.id

            // Wrap content in a MarkNode
            $wrapSelectionInMarkNode(selection, isBackward, id)
          }
        })
        setShowCommentInput(false)
      }
    },
    [commentStore, editor],
  )

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

  useEffect(() => {
    const markNodeKeysToIDs: Map<NodeKey, Array<string>> = new Map()

    return mergeRegister(
      registerNestedElementResolver<MarkNode>(
        editor,
        MarkNode,
        (from: MarkNode) => {
          return $createMarkNode(from.getIDs())
        },
        (from: MarkNode, to: MarkNode) => {
          // Merge the IDs
          const ids = from.getIDs()
          ids.forEach((id) => {
            to.addID(id)
          })
        },
      ),
      editor.registerMutationListener(
        MarkNode,
        (mutations) => {
          editor.getEditorState().read(() => {
            for (const [key, mutation] of mutations) {
              const node: null | MarkNode = $getNodeByKey(key)
              let ids: NodeKey[] = []

              if (mutation === 'destroyed') {
                ids = markNodeKeysToIDs.get(key) || []
              } else if ($isMarkNode(node)) {
                ids = node.getIDs()
              }

              for (let i = 0; i < ids.length; i++) {
                const id = ids[i]
                let markNodeKeys = markNodeMap.get(id)
                markNodeKeysToIDs.set(key, ids)

                if (mutation === 'destroyed') {
                  if (markNodeKeys !== undefined) {
                    markNodeKeys.delete(key)
                    if (markNodeKeys.size === 0) {
                      markNodeMap.delete(id)
                    }
                  }
                } else {
                  if (markNodeKeys === undefined) {
                    markNodeKeys = new Set()
                    markNodeMap.set(id, markNodeKeys)
                  }
                  if (!markNodeKeys.has(key)) {
                    markNodeKeys.add(key)
                  }
                }
              }
            }
          })
        },
        { skipInitialization: false },
      ),
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection()
          let hasActiveIds = false
          let hasAnchorKey = false

          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode()

            if ($isTextNode(anchorNode)) {
              const commentIDs = $getMarkIDs(
                anchorNode,
                selection.anchor.offset,
              )
              if (commentIDs !== null) {
                setActiveIDs(commentIDs)
                hasActiveIds = true
              }
              if (!selection.isCollapsed()) {
                setActiveAnchorKey(anchorNode.getKey())
                hasAnchorKey = true
              }
            }
          }
          if (!hasActiveIds) {
            setActiveIDs((_activeIds) =>
              _activeIds.length === 0 ? _activeIds : [],
            )
          }
          if (!hasAnchorKey) {
            setActiveAnchorKey(null)
          }
        })
      }),
      editor.registerCommand(
        INSERT_COMMENT_COMMAND,
        () => {
          setShowCommentInput(true)
          return true
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        TOGGLE_COMMENTS_COMMAND,
        () => {
          setShowComments(!showComments)
          return true
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (showCommentInput) {
            cancelAddComment()
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [
    cancelAddComment,
    editor,
    markNodeMap,
    showComments,
    showCommentInput,
  ])

  const onAddComment = useCallback(() => {
    editor.dispatchCommand(INSERT_COMMENT_COMMAND, undefined)
  }, [editor])

  const toggleComments = useCallback(() => {
    editor.dispatchCommand(TOGGLE_COMMENTS_COMMAND, undefined)
  }, [editor])

  // Load comments when documentId changes
  useEffect(() => {
    if (documentId) {
      commentStore.loadComments(documentId)
    }
  }, [commentStore, documentId])

  return (
    <>
      {showCommentInput &&
        createPortal(
          <CommentInputBox
            editor={editor}
            cancelAddComment={cancelAddComment}
            submitAddComment={submitAddComment}
            author={currentUser}
          />,
          document.body,
        )}
      {activeAnchorKey !== null &&
        !showCommentInput &&
        createPortal(
          <AddCommentBox
            anchorKey={activeAnchorKey}
            editor={editor}
            onAddComment={onAddComment}
          />,
          document.body,
        )}
      {createPortal(
        <button
          className={`CommentPlugin_ShowCommentsButton ${
            showComments ? 'active' : ''
          }`}
          onClick={toggleComments}
          title={showComments ? 'Hide Comments' : 'Show Comments'}
          aria-label={showComments ? 'Hide Comments' : 'Show Comments'}
        >
          <i className="comments" />
          Comments
        </button>,
        document.body,
      )}
      {showComments &&
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
