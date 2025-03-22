'use client'

/**
 * Extracts the document ID from the current URL path
 * @returns The document ID or 'default' if not found
 */
export function getDocumentIdFromUrl(): string {
  if (typeof window === 'undefined') return 'default';
  return window.location.pathname.split('/').pop() || 'default';
}

/**
 * Extracts the collection name from the current URL path
 * @returns The collection name or null if not found
 */
export function getCollectionFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const pathParts = window.location.pathname.split('/');
  const collectionIndex = pathParts.findIndex(part => part === 'collections');
  
  if (collectionIndex === -1 || collectionIndex + 1 >= pathParts.length) {
    return null;
  }
  
  return pathParts[collectionIndex + 1];
}

/**
 * Gets the API endpoint for a document
 * @param collection The collection name
 * @param documentId The document ID
 * @returns The API endpoint for the document
 */
export function getDocumentApiEndpoint(collection: string, documentId: string): string {
  return `/api/${collection}/${documentId}`;
}
