'use client'

import { useEffect, useMemo } from 'react'
import type { LexicalEditor, NodeKey } from '@payloadcms/richtext-lexical/lexical'
import type { MarkNodeMapType } from '../../types/core.js'
import type { CommentMarksResult } from '../../types/hooks.js'
import { mergeRegister, registerNestedElementResolver } from '@payloadcms/richtext-lexical/lexical/utils'
import {
  $createMarkNode,
  $getMarkIDs,
  $isMarkNode,
  MarkNode,
} from '@payloadcms/richtext-lexical/lexical/mark'
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
} from '@payloadcms/richtext-lexical/lexical'

/**
 * Hook for handling comment marks in the editor
 * @param editor The Lexical editor instance
 * @param setActiveIDs Function to set active comment IDs
 * @param setActiveAnchorKey Function to set active anchor key
 * @returns Map of mark node keys to IDs
 */
export function useCommentMarks(
  editor: LexicalEditor,
  setActiveIDs: (ids: string[]) => void,
  setActiveAnchorKey: (key: NodeKey | null) => void
): MarkNodeMapType {
  // Create a map to track mark nodes
  const markNodeMap = useMemo<MarkNodeMapType>(() => {
    return new Map()
  }, [])

  useEffect(() => {
    const markNodeKeysToIDs: Map<NodeKey, Array<string>> = new Map()

    return mergeRegister(
      // Register nested element resolver for mark nodes
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
      
      // Register mutation listener for mark nodes
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
      
      // Register update listener to track active IDs and anchor key
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
            setActiveIDs([])
          }
          if (!hasAnchorKey) {
            setActiveAnchorKey(null)
          }
        })
      }),
    )
  }, [editor, markNodeMap, setActiveIDs, setActiveAnchorKey])

  return markNodeMap
}
