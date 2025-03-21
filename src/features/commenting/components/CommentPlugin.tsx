'use client'

import type { NodeKey } from '@payloadcms/richtext-lexical/lexical'
import type { Comment, Thread } from '../store.js'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
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

  // Function to save the document content
  const saveDocument = useCallback(async () => {
    try {
      // Get the document ID from the URL or props
      const docId = documentId || window.location.pathname.split('/').pop() || 'default';
      
      // Get the collection name from the URL path
      const pathParts = window.location.pathname.split('/');
      const collectionIndex = pathParts.findIndex(part => part === 'collections');
      if (collectionIndex === -1) {
        console.error('Could not determine collection from URL path');
        return;
      }
      
      const collection = pathParts[collectionIndex + 1];
      if (!collection) {
        console.error('Could not determine collection from URL path');
        return;
      }
      
      console.log(`Saving document: ${docId} in collection: ${collection}`);
      
      // First, try to get the current document to determine the field name
      let fieldName = 'content'; // Default field name
      
      try {
        const docResponse = await fetch(`/api/${collection}/${docId}`);
        if (docResponse.ok) {
          const docData = await docResponse.json();
          
          // Look for fields that might be rich text fields
          const possibleFieldNames = Object.keys(docData).filter(key => {
            // Check if the field value is an object and has properties that suggest it's a rich text field
            const value = docData[key];
            return (
              typeof value === 'object' && 
              value !== null && 
              (value.root || value.type === 'root' || value.version)
            );
          });
          
          if (possibleFieldNames.length > 0) {
            // Use the first field that looks like a rich text field
            fieldName = possibleFieldNames[0];
            console.log(`Detected rich text field name: ${fieldName}`);
          } else {
            console.log(`Could not detect rich text field, using default: ${fieldName}`);
          }
        }
      } catch (error) {
        console.warn('Error fetching document to determine field name:', error);
        console.log(`Using default field name: ${fieldName}`);
      }
      
      // Get the current editor state as JSON
      const editorState = editor.getEditorState();
      const editorStateJSON = JSON.stringify(editorState.toJSON());
      
      // Create the update payload with the detected field name
      const updatePayload = {
        [fieldName]: editorStateJSON
      };
      
      console.log(`Updating document with field: ${fieldName}`);
      
      // Make an API call to update the document
      const response = await fetch(`/api/${collection}/${docId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });
      
      if (response.ok) {
        console.log('Document saved successfully');
      } else {
        console.error('Failed to save document:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      }
    } catch (error) {
      console.error('Error saving document:', error);
    }
  }, [documentId, editor]);

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
        
        // Mark as deleted in the database using Payload's built-in REST API
        console.log(`Marking comment as deleted: ${comment.id}`);
        fetch(`/api/lexical-collaboration-plugin-comments/${comment.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resolved: true, // Use resolved field to mark as deleted
          }),
        })
        .then(response => {
          if (response.ok) {
            console.log(`Successfully marked comment ${comment.id} as deleted`);
            return response.json();
          } else {
            console.error(`Failed to mark comment ${comment.id} as deleted:`, response.status, response.statusText);
            return response.text().then(text => {
              throw new Error(text);
            });
          }
        })
        .then(data => {
          console.log('Updated comment data:', data);
        })
        .catch(error => {
          console.error('Error marking comment as deleted:', error);
        });
        
        commentStore.addComment(markedComment, thread, index)
      } else {
        commentStore.deleteCommentOrThread(comment)
        
        // Mark thread as resolved in the database using Payload's built-in REST API
        // Update all comments with this threadId
        console.log(`Marking thread as deleted: ${comment.id}`);
        const threadUrl = `/api/lexical-collaboration-plugin-comments?where[threadId][equals]=${comment.id}`;
        console.log(`Fetching thread comments from: ${threadUrl}`);
        
        fetch(threadUrl, {
          method: 'GET',
        })
          .then(response => {
            if (response.ok) {
              return response.json();
            } else {
              console.error(`Failed to fetch thread comments:`, response.status, response.statusText);
              return response.text().then(text => {
                throw new Error(text);
              });
            }
          })
          .then(data => {
            console.log('Thread comments data:', data);
            // For each comment in the thread, mark it as resolved
            if (data.docs && Array.isArray(data.docs)) {
              console.log(`Found ${data.docs.length} comments in thread ${comment.id}`);
              
              data.docs.forEach((threadComment: any) => {
                console.log(`Marking thread comment as deleted: ${threadComment.id}`);
                
                fetch(`/api/lexical-collaboration-plugin-comments/${threadComment.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    resolved: true,
                  }),
                })
                .then(response => {
                  if (response.ok) {
                    console.log(`Successfully marked thread comment ${threadComment.id} as deleted`);
                    return response.json();
                  } else {
                    console.error(`Failed to mark thread comment ${threadComment.id} as deleted:`, response.status, response.statusText);
                    return response.text().then(text => {
                      throw new Error(text);
                    });
                  }
                })
                .then(data => {
                  console.log('Updated thread comment data:', data);
                })
                .catch(error => {
                  console.error(`Error marking thread comment ${threadComment.id} as deleted:`, error);
                });
              });
            } else {
              console.log(`No comments found in thread ${comment.id}`);
            }
          })
          .catch(error => {
            console.error('Error fetching thread comments:', error);
          });
        
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
            
            // Save the document after removing comment marks
            saveDocument().catch(error => {
              console.error('Error saving document after deleting comment:', error);
            });
          })
        }
      }
    },
    [commentStore, editor, markNodeMap, saveDocument],
  )

  const submitAddComment = useCallback(
    (
      commentOrThread: Comment | Thread,
      isInlineComment: boolean,
      thread?: Thread,
      selection?: any,
    ) => {
      // Use saveComment instead of addComment to persist to database
      commentStore.saveComment(commentOrThread, thread)
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
        
        // Save the document after adding a comment
        saveDocument().catch(error => {
          console.error('Error saving document after adding comment:', error);
        });
      }
    },
    [commentStore, editor, saveDocument],
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
