'use client'

import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import { useAuth } from '@payloadcms/ui'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import { MarkNode } from '@payloadcms/richtext-lexical/lexical/mark'

import { CommentPlugin } from './components/core/CommentPlugin.js'
import { INSERT_COMMENT_COMMAND, TOGGLE_COMMENTS_COMMAND } from './command.js'
import { CommentIcon } from './components/ui/CommentIcon.js'
import { getDocumentIdFromUrl } from './utils/url.js'

export type CommentClientFeatureProps = {
  /**
   * Whether to enable the commenting feature
   * @default true
   */
  enabled?: boolean
}

export const CommentClientFeature = createClientFeature<CommentClientFeatureProps>(
  ({ props }) => {
    const enabled = props?.enabled ?? true

    if (!enabled) {
      return {
        plugins: [],
        toolbarFixed: {
          groups: [],
        },
        toolbarInline: {
          groups: [],
        },
      }
    }

    return {
      nodes: [MarkNode],
      plugins: [
        {
          Component: () => {
            const [editor] = useLexicalComposerContext()
            const { user } = useAuth()
            
            // Get the document ID from the URL
            const documentId = typeof window !== 'undefined' 
              ? getDocumentIdFromUrl()
              : undefined
            
            // Get the current user's name or email
            const currentUser = user?.email || 'Anonymous'

            return (
              <CommentPlugin 
                documentId={documentId} 
                currentUser={currentUser} 
              />
            )
          },
          position: 'normal',
        },
      ],
      toolbarFixed: {
        groups: [
          {
            type: 'dropdown',
            ChildComponent: CommentIcon,
            key: 'commenting',
            items: [
              {
                type: 'button',
                label: 'Add Comment',
                onClick: ({ editor }: { editor: any }) => {
                  editor.dispatchCommand(INSERT_COMMENT_COMMAND, undefined)
                },
                key: 'addComment',
              },
              {
                type: 'button',
                label: 'Toggle Comments',
                onClick: ({ editor }: { editor: any }) => {
                  editor.dispatchCommand(TOGGLE_COMMENTS_COMMAND, undefined)
                },
                key: 'toggleComments',
              },
            ],
          },
        ],
      },
      toolbarInline: {
        groups: [
          {
            type: 'dropdown',
            ChildComponent: CommentIcon,
            key: 'commenting-inline',
            items: [
              {
                type: 'button',
                label: 'Add Comment',
                onClick: ({ editor }: { editor: any }) => {
                  editor.dispatchCommand(INSERT_COMMENT_COMMAND, undefined)
                },
                key: 'addComment-inline',
              },
            ],
          },
        ],
      },
    }
  },
)
