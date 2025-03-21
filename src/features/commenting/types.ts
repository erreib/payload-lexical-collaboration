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

export interface CommentStoreInterface {
  getComments(): Comments
  addComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
    offset?: number,
  ): void
  deleteCommentOrThread(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): {markedComment: Comment; index: number} | null
  registerOnChange(onChange: () => void): () => void
  loadComments(documentId: string): Promise<void>
  saveComment(
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ): Promise<void>
}
