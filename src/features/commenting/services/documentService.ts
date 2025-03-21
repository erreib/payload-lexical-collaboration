'use client'

import type { LexicalEditor } from '@payloadcms/richtext-lexical/lexical'

/**
 * Service for handling document-related operations
 */
export class DocumentService {
  /**
   * Check if a document exists in the database
   * @param documentId The document ID to check
   * @returns True if the document exists, false otherwise
   */
  async checkIfDocumentExists(documentId: string): Promise<boolean> {
    try {
      // Get the document ID from the URL or props
      const docId = documentId || window.location.pathname.split('/').pop() || 'default';
      
      // Get the collection name from the URL path
      const pathParts = window.location.pathname.split('/');
      const collectionIndex = pathParts.findIndex(part => part === 'collections');
      if (collectionIndex === -1) {
        console.log('Could not determine collection from URL path');
        return false;
      }
      
      const collection = pathParts[collectionIndex + 1];
      if (!collection) {
        console.log('Could not determine collection from URL path');
        return false;
      }
      
      // Check if document exists by making a GET request
      const response = await fetch(`/api/${collection}/${docId}`);
      const exists = response.ok;
      
      console.log(`Document ${docId} in collection ${collection} exists: ${exists}`);
      return exists;
    } catch (error) {
      console.error('Error checking if document exists:', error);
      return false;
    }
  }

  /**
   * Detect the rich text field name in a document
   * @param collection The collection name
   * @param docId The document ID
   * @returns The detected field name or 'content' as default
   */
  async detectRichTextField(collection: string, docId: string): Promise<string> {
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
    
    return fieldName;
  }

  /**
   * Save the document content
   * @param editor The Lexical editor instance
   * @param documentId The document ID to save
   * @returns True if the document was saved successfully, false otherwise
   */
  async saveDocument(editor: LexicalEditor, documentId: string): Promise<boolean> {
    try {
      // Get the document ID from the URL or props
      const docId = documentId || window.location.pathname.split('/').pop() || 'default';
      
      // Get the collection name from the URL path
      const pathParts = window.location.pathname.split('/');
      const collectionIndex = pathParts.findIndex(part => part === 'collections');
      if (collectionIndex === -1) {
        console.error('Could not determine collection from URL path');
        return false;
      }
      
      const collection = pathParts[collectionIndex + 1];
      if (!collection) {
        console.error('Could not determine collection from URL path');
        return false;
      }
      
      console.log(`Saving document: ${docId} in collection: ${collection}`);
      
      // Detect the field name
      const fieldName = await this.detectRichTextField(collection, docId);
      
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
        return true;
      } else {
        console.error('Failed to save document:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return false;
      }
    } catch (error) {
      console.error('Error saving document:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const documentService = new DocumentService();
