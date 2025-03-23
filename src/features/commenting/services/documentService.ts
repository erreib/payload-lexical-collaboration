'use client'

import type { LexicalEditor } from '@payloadcms/richtext-lexical/lexical'
import type { IDocumentService } from '../types/services.js'
import { getCollectionFromUrl, getDocumentApiEndpoint, getDocumentIdFromUrl } from '../utils/url.js'
import { APIUtils } from '../utils/api.js'
import { withErrorHandling } from '../utils/errorHandling.js'

/**
 * Service for handling document-related operations
 */
export class DocumentService implements IDocumentService {
  /**
   * Check if a document exists in the database
   * @param documentId The document ID to check
   * @returns True if the document exists, false otherwise
   */
  async checkIfDocumentExists(documentId: string): Promise<boolean> {
    return withErrorHandling(
      async () => {
        // Get the document ID from the URL or props
        const docId = documentId || getDocumentIdFromUrl()
        
        // Get the collection name from the URL path
        const collection = getCollectionFromUrl()
        if (!collection) {
          return false
        }
        
        // Check if document exists by making a GET request
        const response = await fetch(getDocumentApiEndpoint(collection, docId))
        return response.ok
      },
      'Error checking if document exists',
      false
    )
  }

  /**
   * Detect the rich text field name in a document
   * @param collection The collection name
   * @param docId The document ID
   * @returns The detected field name or 'content' as default
   */
  async detectRichTextField(collection: string, docId: string): Promise<string> {
    return withErrorHandling(
      async () => {
        let fieldName = 'content' // Default field name
        
        const endpoint = getDocumentApiEndpoint(collection, docId)
        const docData = await APIUtils.get<Record<string, any>>(endpoint)
        
        // Look for fields that might be rich text fields
        const possibleFieldNames = Object.keys(docData).filter(key => {
          // Check if the field value is an object and has properties that suggest it's a rich text field
          const value = docData[key]
          return (
            typeof value === 'object' && 
            value !== null && 
            (value.root || value.type === 'root' || value.version)
          )
        })
        
        if (possibleFieldNames.length > 0) {
          // Use the first field that looks like a rich text field
          fieldName = possibleFieldNames[0]
        }
        
        return fieldName
      },
      'Error fetching document to determine field name',
      'content' // Default field name as fallback
    )
  }

  /**
   * Save the document content
   * @param editor The Lexical editor instance
   * @param documentId The document ID to save
   * @returns True if the document was saved successfully, false otherwise
   */
  async saveDocument(editor: LexicalEditor, documentId: string): Promise<boolean> {
    return withErrorHandling(
      async () => {
        // Get the document ID from the URL or props
        const docId = documentId || getDocumentIdFromUrl()
        
        // Get the collection name from the URL path
        const collection = getCollectionFromUrl()
        if (!collection) {
          return false
        }
        
        // Detect the field name
        const fieldName = await this.detectRichTextField(collection, docId)
        
        // Get the current editor state as JSON
        const editorState = editor.getEditorState()
        const editorStateJSON = JSON.stringify(editorState.toJSON())
        
        // Create the update payload with the detected field name
        const updatePayload = {
          [fieldName]: editorStateJSON
        }
        
        // Make an API call to update the document
        const endpoint = getDocumentApiEndpoint(collection, docId)
        await APIUtils.patch(endpoint, updatePayload)
        
        return true
      },
      'Error saving document',
      false
    )
  }
}

// Export a singleton instance
export const documentService = new DocumentService()
