'use client'

import type { LexicalEditor, NodeKey } from '@payloadcms/richtext-lexical/lexical'
import type { Comment, Thread } from '../types.js'
import type { CommentStore } from '../store.js'
import {
  $isMarkNode,
  $unwrapMarkNode,
  $wrapSelectionInMarkNode,
  MarkNode,
} from '@payloadcms/richtext-lexical/lexical/mark'
import {
  $getNodeByKey,
  $isRangeSelection,
} from '@payloadcms/richtext-lexical/lexical'

/**
 * Service for handling comment operations
 */
export class CommentOperations {
  /**
   * Delete a comment or thread
   * @param commentStore The comment store instance
   * @param editor The Lexical editor instance
   * @param markNodeMap Map of mark node keys to IDs
   * @param comment The comment or thread to delete
   * @param thread The parent thread (if deleting a comment within a thread)
   * @param saveDocumentCallback Optional callback to save the document after deletion
   * @returns The deletion info or null
   */
  async deleteCommentOrThread(
    commentStore: CommentStore,
    editor: LexicalEditor,
    markNodeMap: Map<string, Set<NodeKey>>,
    comment: Comment | Thread,
    thread?: Thread,
    saveDocumentCallback?: () => Promise<void | boolean>
  ): Promise<{markedComment: Comment; index: number} | null> {
    if (comment.type === 'comment') {
      const deletionInfo = commentStore.deleteCommentOrThread(
        comment,
        thread,
      )
      if (!deletionInfo) {
        return null;
      }
      const { markedComment, index } = deletionInfo
      
      // Mark as deleted in the database using Payload's built-in REST API
      console.log(`Marking comment as deleted: ${comment.id}`);
      try {
        const response = await fetch(`/api/lexical-collaboration-plugin-comments/${comment.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resolved: true, // Use resolved field to mark as deleted
          }),
        });
        
        if (response.ok) {
          console.log(`Successfully marked comment ${comment.id} as deleted`);
          const data = await response.json();
          console.log('Updated comment data:', data);
        } else {
          console.error(`Failed to mark comment ${comment.id} as deleted:`, response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error details:', errorText);
        }
      } catch (error) {
        console.error('Error marking comment as deleted:', error);
      }
      
      commentStore.addComment(markedComment, thread, index);
      return deletionInfo;
    } else {
      commentStore.deleteCommentOrThread(comment);
      
      // Mark thread as resolved in the database using Payload's built-in REST API
      // Update all comments with this threadId
      console.log(`Marking thread as deleted: ${comment.id}`);
      try {
        const threadUrl = `/api/lexical-collaboration-plugin-comments?where[threadId][equals]=${comment.id}`;
        console.log(`Fetching thread comments from: ${threadUrl}`);
        
        const response = await fetch(threadUrl, {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Thread comments data:', data);
          
          // For each comment in the thread, mark it as resolved
          if (data.docs && Array.isArray(data.docs)) {
            console.log(`Found ${data.docs.length} comments in thread ${comment.id}`);
            
            const updatePromises = data.docs.map(async (threadComment: any) => {
              console.log(`Marking thread comment as deleted: ${threadComment.id}`);
              
              try {
                const updateResponse = await fetch(`/api/lexical-collaboration-plugin-comments/${threadComment.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    resolved: true,
                  }),
                });
                
                if (updateResponse.ok) {
                  console.log(`Successfully marked thread comment ${threadComment.id} as deleted`);
                  const updateData = await updateResponse.json();
                  console.log('Updated thread comment data:', updateData);
                } else {
                  console.error(`Failed to mark thread comment ${threadComment.id} as deleted:`, 
                    updateResponse.status, updateResponse.statusText);
                  const errorText = await updateResponse.text();
                  console.error('Error details:', errorText);
                }
              } catch (error) {
                console.error(`Error marking thread comment ${threadComment.id} as deleted:`, error);
              }
            });
            
            // Wait for all updates to complete
            await Promise.all(updatePromises);
          } else {
            console.log(`No comments found in thread ${comment.id}`);
          }
        } else {
          console.error(`Failed to fetch thread comments:`, response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error details:', errorText);
        }
      } catch (error) {
        console.error('Error fetching thread comments:', error);
      }
      
      // Remove ids from associated marks
      const id = thread !== undefined ? thread.id : comment.id;
      const markNodeKeys = markNodeMap.get(id);
      
      if (markNodeKeys !== undefined) {
        // Do async to avoid causing a React infinite loop
        setTimeout(async () => {
          editor.update(() => {
            for (const key of markNodeKeys) {
              const node: null | MarkNode = $getNodeByKey(key);
              if ($isMarkNode(node)) {
                node.deleteID(id);
                if (node.getIDs().length === 0) {
                  $unwrapMarkNode(node);
                }
              }
            }
          });
          
          // Save the document after removing comment marks
          if (saveDocumentCallback) {
            await saveDocumentCallback();
          }
        });
      }
      
      return null;
    }
  }

  /**
   * Submit a new comment or thread
   * @param commentStore The comment store instance
   * @param editor The Lexical editor instance
   * @param commentOrThread The comment or thread to add
   * @param isInlineComment Whether this is an inline comment
   * @param thread The parent thread (if adding a comment to a thread)
   * @param selection The current selection (for inline comments)
   * @param saveDocumentCallback Optional callback to save the document after adding the comment
   */
  async submitAddComment(
    commentStore: CommentStore,
    editor: LexicalEditor,
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
    selection?: any,
    saveDocumentCallback?: () => Promise<void | boolean>
  ): Promise<void> {
    // Use saveComment instead of addComment to persist to database
    await commentStore.saveComment(commentOrThread, thread);
    
    if (isInlineComment && selection) {
      editor.update(() => {
        if ($isRangeSelection(selection)) {
          const isBackward = selection.isBackward();
          const id = commentOrThread.id;

          // Wrap content in a MarkNode
          $wrapSelectionInMarkNode(selection, isBackward, id);
        }
      });
      
      // Save the document after adding a comment
      if (saveDocumentCallback) {
        await saveDocumentCallback();
      }
    }
  }
}

// Export a singleton instance
export const commentOperations = new CommentOperations();
