import type { LexicalEditor } from '@payloadcms/richtext-lexical/lexical'

export type Comment = {
  author: string
  content: string
  deleted: boolean
  id: string
  timeStamp: number
  type: 'comment'
}

export type Thread = {
  comments: Array<Comment>
  id: string
  quote: string
  type: 'thread'
}

export type Comments = Array<Thread | Comment>

// Keep track of generated IDs to ensure uniqueness
const generatedIds = new Set<string>();

function createUID(): string {
  let id: string;
  do {
    // Generate a more unique ID by combining timestamp and random string
    id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  } while (generatedIds.has(id));
  
  // Add the ID to the set of generated IDs
  generatedIds.add(id);
  return id;
}

export function createComment(
  content: string,
  author: string,
  id?: string,
  timeStamp?: number,
  deleted?: boolean,
): Comment {
  return {
    author,
    content,
    deleted: deleted === undefined ? false : deleted,
    id: id === undefined ? createUID() : id,
    timeStamp:
      timeStamp === undefined
        ? performance.timeOrigin + performance.now()
        : timeStamp,
    type: 'comment',
  }
}

export function createThread(
  quote: string,
  comments: Array<Comment>,
  id?: string,
): Thread {
  return {
    comments,
    id: id === undefined ? createUID() : id,
    quote,
    type: 'thread',
  }
}

function cloneThread(thread: Thread): Thread {
  return {
    comments: Array.from(thread.comments),
    id: thread.id,
    quote: thread.quote,
    type: 'thread',
  }
}

function markDeleted(comment: Comment): Comment {
  return {
    author: comment.author,
    content: '[Deleted Comment]',
    deleted: true,
    id: comment.id,
    timeStamp: comment.timeStamp,
    type: 'comment',
  }
}

function triggerOnChange(commentStore: CommentStore): void {
  const listeners = commentStore._changeListeners
  for (const listener of listeners) {
    listener()
  }
}

export class CommentStore {
  _editor: LexicalEditor
  _comments: Comments
  _changeListeners: Set<() => void>
  _payload: any // Payload client

  constructor(editor: LexicalEditor) {
    this._comments = []
    this._editor = editor
    this._changeListeners = new Set()
  }

  getComments(): Comments {
    return this._comments
  }

  addComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
    offset?: number,
  ): void {
    const nextComments = Array.from(this._comments)

    if (thread !== undefined && commentOrThread.type === 'comment') {
      // Adding a comment to an existing thread
      for (let i = 0; i < nextComments.length; i++) {
        const comment = nextComments[i]
        if (comment.type === 'thread' && comment.id === thread.id) {
          const newThread = cloneThread(comment)
          
          // Check if this comment already exists in the thread
          const isDuplicate = newThread.comments.some(c => c.id === commentOrThread.id);
          
          if (!isDuplicate) {
            nextComments.splice(i, 1, newThread)
            const insertOffset =
              offset !== undefined ? offset : newThread.comments.length
            newThread.comments.splice(insertOffset, 0, commentOrThread)
            console.log(`Added comment ${commentOrThread.id} to thread ${thread.id}`);
          } else {
            console.log(`Comment ${commentOrThread.id} already exists in thread ${thread.id}, skipping`);
          }
          break
        }
      }
    } else {
      // Adding a new thread
      if (commentOrThread.type === 'thread') {
        // Check if this thread already exists
        const isDuplicate = nextComments.some(c => 
          c.type === 'thread' && c.id === commentOrThread.id
        );
        
        if (!isDuplicate) {
          const insertOffset = offset !== undefined ? offset : nextComments.length
          nextComments.splice(insertOffset, 0, commentOrThread)
          console.log(`Added new thread ${commentOrThread.id}`);
        } else {
          console.log(`Thread ${commentOrThread.id} already exists, skipping`);
        }
      } else {
        // Adding a standalone comment (not in a thread)
        const insertOffset = offset !== undefined ? offset : nextComments.length
        nextComments.splice(insertOffset, 0, commentOrThread)
        console.log(`Added standalone comment ${commentOrThread.id}`);
      }
    }
    this._comments = nextComments
    triggerOnChange(this)
  }

  deleteCommentOrThread(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): {markedComment: Comment; index: number} | null {
    const nextComments = Array.from(this._comments)
    let commentIndex: number | null = null

    if (thread !== undefined) {
      for (let i = 0; i < nextComments.length; i++) {
        const nextComment = nextComments[i]
        if (nextComment.type === 'thread' && nextComment.id === thread.id) {
          const newThread = cloneThread(nextComment)
          nextComments.splice(i, 1, newThread)
          const threadComments = newThread.comments
          commentIndex = threadComments.indexOf(commentOrThread as Comment)
          threadComments.splice(commentIndex, 1)
          break
        }
      }
    } else {
      commentIndex = nextComments.indexOf(commentOrThread)
      nextComments.splice(commentIndex, 1)
    }
    this._comments = nextComments
    triggerOnChange(this)

    if (commentOrThread.type === 'comment') {
      return {
        index: commentIndex as number,
        markedComment: markDeleted(commentOrThread as Comment),
      }
    }

    return null
  }

  registerOnChange(onChange: () => void): () => void {
    const changeListeners = this._changeListeners
    changeListeners.add(onChange)
    return () => {
      changeListeners.delete(onChange)
    }
  }

  // Methods for Payload integration
  async loadComments(documentId: string): Promise<void> {
    try {
      console.log(`Loading comments for document: ${documentId}`);
      
      // Clear existing comments
      this._comments = [];
      
      // Clear the set of generated IDs to avoid conflicts with new IDs
      generatedIds.clear();
      
      // Fetch comments from Payload API using the built-in REST API
      // Only fetch unresolved comments (not marked as deleted)
      const url = `/api/lexical-collaboration-plugin-comments?where[documentId][equals]=${encodeURIComponent(documentId)}&where[resolved][equals]=false&depth=2`;
      console.log(`Fetching comments from: ${url}`);
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Received comments data:', data);
        
        if (data.docs && Array.isArray(data.docs)) {
          // Convert Payload comments to our format
          
          // Group comments by threadId
          const threadMap = new Map<string, Comment[]>();
          
          // First pass: group comments by threadId
          data.docs.forEach((comment: any) => {
            console.log('Processing comment:', comment);
            
            if (!comment.threadId) {
              console.log('Skipping comment without threadId');
              return;
            }
            
            if (!threadMap.has(comment.threadId)) {
              threadMap.set(comment.threadId, []);
            }
            
            // Get author email from the author relationship
            let authorEmail = 'Unknown';
            if (comment.author) {
              if (typeof comment.author === 'string') {
                authorEmail = comment.author;
              } else if (comment.author.email) {
                authorEmail = comment.author.email;
              }
            }
            
            // Add the comment ID to the set of generated IDs to prevent duplicates
            if (comment.id) {
              generatedIds.add(comment.id);
            }
            
            const commentObj = createComment(
              comment.content,
              authorEmail,
              comment.id,
              comment.createdAt ? new Date(comment.createdAt).getTime() : undefined,
              comment.resolved || false
            );
            
            // Check if this comment is already in the thread
            const existingComments = threadMap.get(comment.threadId)!;
            const isDuplicate = existingComments.some(c => c.id === commentObj.id);
            
            if (!isDuplicate) {
              existingComments.push(commentObj);
            } else {
              console.log(`Skipping duplicate comment: ${commentObj.id}`);
            }
          });
          
          console.log('Thread map:', Array.from(threadMap.entries()));
          
          // Second pass: create threads
          threadMap.forEach((comments, threadId) => {
            // Find the first comment to get the quote
            const firstComment = comments.find(c => !c.deleted);
            if (firstComment) {
              const commentData = data.docs.find((c: any) => c.id === firstComment.id);
              const quote = commentData?.quote || '';
              
              // Add the thread ID to the set of generated IDs to prevent duplicates
              generatedIds.add(threadId);
              
              const thread = createThread(
                quote,
                comments,
                threadId
              );
              
              // Check if this thread is already in the comments
              const isDuplicate = this._comments.some(c => 
                c.type === 'thread' && c.id === thread.id
              );
              
              if (!isDuplicate) {
                this._comments.push(thread);
              } else {
                console.log(`Skipping duplicate thread: ${thread.id}`);
              }
            }
          });
          
          console.log('Loaded comments:', this._comments);
          triggerOnChange(this);
        } else {
          console.log('No comments found or invalid data structure');
        }
      } else {
        console.error('Failed to fetch comments:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  async saveComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): Promise<void> {
    try {
      console.log('Saving comment:', commentOrThread, 'thread:', thread);
      
      // Make sure the ID is in the generatedIds set to prevent duplicates
      if (commentOrThread.type === 'thread') {
        generatedIds.add(commentOrThread.id);
        for (const comment of commentOrThread.comments) {
          generatedIds.add(comment.id);
        }
      } else {
        generatedIds.add(commentOrThread.id);
      }
      
      // Add to local store first for immediate feedback
      this.addComment(commentOrThread, thread);
      
      // Get the document ID from the URL
      const documentId = window.location.pathname.split('/').pop() || 'default';
      console.log('Document ID:', documentId);
      
      // Then save to Payload API using the built-in REST API
      if (commentOrThread.type === 'thread') {
        const threadObj = commentOrThread as Thread;
        console.log('Saving thread:', threadObj);
        
        // Save each comment in the thread
        for (const comment of threadObj.comments) {
          console.log('Saving comment in thread:', comment);
          
          // First, find the user ID by email
          const userUrl = `/api/users?where[email][equals]=${encodeURIComponent(comment.author)}`;
          console.log('Fetching user from:', userUrl);
          
          const userResponse = await fetch(userUrl);
          const userData = await userResponse.json();
          console.log('User data:', userData);
          
          // Get the first user that matches the email
          const userId = userData.docs && userData.docs.length > 0 ? userData.docs[0].id : null;
          
          if (userId) {
            console.log('Found user ID:', userId);
            
            const commentData = {
              documentId,
              threadId: threadObj.id,
              content: comment.content,
              author: userId, // Use the user ID instead of email
              quote: threadObj.quote,
              range: null, // We could store the range if needed
            };
            
            console.log('Saving comment with data:', commentData);
            
            const saveResponse = await fetch('/api/lexical-collaboration-plugin-comments', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(commentData),
            });
            
            if (saveResponse.ok) {
              const savedComment = await saveResponse.json();
              console.log('Comment saved successfully:', savedComment);
            } else {
              console.error('Failed to save comment:', saveResponse.status, saveResponse.statusText);
              const errorText = await saveResponse.text();
              console.error('Error details:', errorText);
            }
          } else {
            console.error(`Could not find user with email: ${comment.author}`);
          }
        }
      } else if (commentOrThread.type === 'comment' && thread) {
        // Save a comment that's part of a thread
        const comment = commentOrThread as Comment;
        console.log('Saving comment in existing thread:', comment, 'thread:', thread);
        
        // First, find the user ID by email
        const userUrl = `/api/users?where[email][equals]=${encodeURIComponent(comment.author)}`;
        console.log('Fetching user from:', userUrl);
        
        const userResponse = await fetch(userUrl);
        const userData = await userResponse.json();
        console.log('User data:', userData);
        
        // Get the first user that matches the email
        const userId = userData.docs && userData.docs.length > 0 ? userData.docs[0].id : null;
        
        if (userId) {
          console.log('Found user ID:', userId);
          
          const commentData = {
            documentId,
            threadId: thread.id,
            content: comment.content,
            author: userId, // Use the user ID instead of email
            parentComment: null, // We could implement replies if needed
          };
          
          console.log('Saving comment with data:', commentData);
          
          const saveResponse = await fetch('/api/lexical-collaboration-plugin-comments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(commentData),
          });
          
          if (saveResponse.ok) {
            const savedComment = await saveResponse.json();
            console.log('Comment saved successfully:', savedComment);
          } else {
            console.error('Failed to save comment:', saveResponse.status, saveResponse.statusText);
            const errorText = await saveResponse.text();
            console.error('Error details:', errorText);
          }
        } else {
          console.error(`Could not find user with email: ${comment.author}`);
        }
      }
    } catch (error) {
      console.error('Error saving comment:', error);
    }
  }
}

// React hook to use the comment store
import { useState, useEffect } from 'react'

export function useCommentStore(commentStore: CommentStore): Comments {
  const [comments, setComments] = useState<Comments>(
    commentStore.getComments(),
  )

  useEffect(() => {
    return commentStore.registerOnChange(() => {
      setComments(commentStore.getComments())
    })
  }, [commentStore])

  return comments
}
