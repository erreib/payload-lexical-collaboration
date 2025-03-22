import type { CollectionSlug, Config } from 'payload'

export { CommentFeature } from './features/commenting/feature.server.js'
export type { CommentFeatureProps } from './features/commenting/feature.server.js'

export type PayloadLexicalCollaborationConfig = {
  /**
   * List of collections to add a custom field
   */
  collections?: Partial<Record<CollectionSlug, true>>
  disabled?: boolean
}

export const payloadLexicalCollaboration =
  (pluginOptions: PayloadLexicalCollaborationConfig) =>
  (config: Config): Config => {
    if (!config.collections) {
      config.collections = []
    }

    // Add the comments collection
    config.collections.push({
      slug: 'lexical-collaboration-plugin-comments',
      admin: {
        useAsTitle: 'content',
        defaultColumns: ['content', 'author', 'createdAt'],
        hidden: true,
      },
      access: {
        read: () => true,
      },
      fields: [
        {
          name: 'documentId',
          type: 'text',
          required: true,
          index: true,
        },
        {
          name: 'threadId',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          type: 'text',
          required: true,
        },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'quote',
          type: 'text',
        },
        {
          name: 'range',
          type: 'json',
        },
        {
          name: 'resolved',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'parentComment',
          type: 'relationship',
          relationTo: 'lexical-collaboration-plugin-comments',
        }
      ]
    })


    /**
     * If the plugin is disabled, we still want to keep added collections/fields so the database schema is consistent which is important for migrations.
     * If your plugin heavily modifies the database schema, you may want to remove this property.
     */
    if (pluginOptions.disabled) {
      return config
    }

    if (!config.endpoints) {
      config.endpoints = []
    }

    // Using Payload's built-in REST API for endpoints

    if (!config.admin) {
      config.admin = {}
    }

    if (!config.admin.components) {
      config.admin.components = {}
    }

    if (!config.admin.components.beforeDashboard) {
      config.admin.components.beforeDashboard = []
    }


    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      // Ensure we are executing any existing onInit functions before running our own.
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }

      // Plugin initialization complete
    }

    return config
  }
