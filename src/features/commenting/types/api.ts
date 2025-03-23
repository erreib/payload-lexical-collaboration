/**
 * API-related types for the commenting feature
 */


/**
 * Standard Payload CMS API response format
 */
export type PayloadAPIResponse<T> = {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

/**
 * Comment entity as returned from the Payload API
 */
export type CommentAPIEntity = {
  id: string
  documentId: string
  threadId?: string
  content: string
  author: string | { id: string; email: string }
  quote?: string
  range?: any
  createdAt: string
  updatedAt: string
  resolved: boolean
}

/**
 * User entity as returned from the Payload API
 */
export type UserAPIEntity = {
  id: string
  email: string
  // other user fields as needed
}

/**
 * Request to save a comment
 */
export type SaveCommentRequest = {
  documentId: string
  threadId?: string
  content: string
  author: string
  quote?: string
  range?: any
}

/**
 * Standard error response
 */
export type ErrorResponse = {
  error: string
  details?: any
}

/**
 * API endpoints used in the commenting feature
 */
export const API_ENDPOINTS = {
  COMMENTS: '/api/lexical-collaboration-plugin-comments',
  USERS: '/api/users'
}
