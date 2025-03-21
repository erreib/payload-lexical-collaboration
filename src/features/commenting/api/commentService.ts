import { Comment, Thread, Comments } from '../types.js'
import { createComment, createThread } from '../utils/factory.js'
import { generatedIds } from '../utils/id.js'

/**
 * Service for handling comment-related API operations
 */
export class CommentService {
  /**
   * Finds a user by email
   * @param email User email to search for
   * @returns User ID if found, null otherwise
   */
  async findUserByEmail(email: string): Promise<string | null> {
    try {
      const userUrl = `/api/users?where[email][equals]=${encodeURIComponent(email)}`;
      
      const userResponse = await fetch(userUrl);
      const userData = await userResponse.json();
      
      // Get the first user that matches the email
      return userData.docs && userData.docs.length > 0 ? userData.docs[0].id : null;
    } catch (error) {
      console.error(`Error finding user with email ${email}:`, error);
      return null;
    }
  }

  /**
   * Extracts author email from a comment object
   * @param author Author object or string
   * @returns Author email
   */
  private getAuthorEmail(author: any): string {
    if (!author) return 'Unknown';
    if (typeof author === 'string') return author;
    return author.email || 'Unknown';
  }

  /**
   * Loads comments for a document from the Payload API
   * @param documentId Document ID to load comments for
   * @returns Array of comments and threads
   */
  async loadComments(documentId: string): Promise<Comments> {
    try {
      // Clear the set of generated IDs to avoid conflicts with new IDs
      generatedIds.clear();
      
      // Fetch comments from Payload API
      const url = `/api/lexical-collaboration-plugin-comments?where[documentId][equals]=${encodeURIComponent(documentId)}&where[resolved][equals]=false&depth=2`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Failed to fetch comments:', response.status, response.statusText);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.docs || !Array.isArray(data.docs)) {
        return [];
      }
      
      // Group comments by threadId
      const threadMap = new Map<string, Comment[]>();
      
      // First pass: group comments by threadId
      data.docs.forEach((comment: any) => {
        if (!comment.threadId) return;
        
        if (!threadMap.has(comment.threadId)) {
          threadMap.set(comment.threadId, []);
        }
        
        // Get author email
        const authorEmail = this.getAuthorEmail(comment.author);
        
        // Add the comment ID to the set of generated IDs
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
        }
      });
      
      // Second pass: create threads
      const comments: Comments = [];
      
      threadMap.forEach((threadComments, threadId) => {
        // Find the first comment to get the quote
        const firstComment = threadComments.find(c => !c.deleted);
        if (!firstComment) return;
        
        const commentData = data.docs.find((c: any) => c.id === firstComment.id);
        const quote = commentData?.quote || '';
        
        // Add the thread ID to the set of generated IDs
        generatedIds.add(threadId);
        
        const thread = createThread(quote, threadComments, threadId);
        comments.push(thread);
      });
      
      return comments;
    } catch (error) {
      console.error('Error loading comments:', error);
      return [];
    }
  }

  /**
   * Saves a comment to the Payload API
   * @param commentOrThread Comment or thread to save
   * @param thread Parent thread if saving a comment within a thread
   * @param documentId Document ID to associate the comment with
   */
  async saveComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
    documentId?: string
  ): Promise<boolean> {
    try {
      // Register IDs to prevent duplicates
      if (commentOrThread.type === 'thread') {
        generatedIds.add(commentOrThread.id);
        for (const comment of commentOrThread.comments) {
          generatedIds.add(comment.id);
        }
      } else {
        generatedIds.add(commentOrThread.id);
      }
      
      // Get the document ID from the URL if not provided
      const docId = documentId || window.location.pathname.split('/').pop() || 'default';
      
      // Save to Payload API
      if (commentOrThread.type === 'thread') {
        const threadObj = commentOrThread as Thread;
        
        // Save each comment in the thread
        for (const comment of threadObj.comments) {
          const success = await this.saveThreadComment(comment, threadObj, docId);
          if (!success) return false;
        }
        
        return true;
      } else if (commentOrThread.type === 'comment' && thread) {
        // Save a comment that's part of a thread
        return await this.saveThreadComment(commentOrThread as Comment, thread, docId);
      }
      
      return false;
    } catch (error) {
      console.error('Error saving comment:', error);
      return false;
    }
  }

  /**
   * Helper method to save a comment within a thread
   */
  private async saveThreadComment(
    comment: Comment,
    thread: Thread,
    documentId: string
  ): Promise<boolean> {
    // Find the user ID by email
    const userId = await this.findUserByEmail(comment.author);
    
    if (!userId) {
      console.error(`Could not find user with email: ${comment.author}`);
      return false;
    }
    
    const commentData = {
      documentId,
      threadId: thread.id,
      content: comment.content,
      author: userId,
      quote: thread.quote,
      range: null,
    };
    
    try {
      const saveResponse = await fetch('/api/lexical-collaboration-plugin-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      });
      
      if (!saveResponse.ok) {
        console.error('Failed to save comment:', saveResponse.status, saveResponse.statusText);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error saving comment:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const commentService = new CommentService();
